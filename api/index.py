import os
import uuid
import threading
import re
import smtplib
import json
import random
import time
import base64
import email
import email.policy
from email.message import EmailMessage
from datetime import datetime, timedelta, UTC
from collections import defaultdict
import fitz  # PyMuPDF
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from werkzeug.utils import secure_filename
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from supabase import create_client, Client # New import for Supabase

# DEV ONLY: allow http://localhost for OAuth during local development (remove in production)
if os.getenv("VERCEL_ENV") != "production":
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

# Load .env from project root (go one folder up from /api)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ==================== SUPABASE CONFIGURATION ====================
SUPABASE_URL = os.getenv("SUPABASE_URL") 
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "resumes")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Supabase client initialized successfully.")
except Exception as e:
    print(f"Failed to initialize Supabase client: {e}")
    supabase = None

# ==================== CHAT HISTORY MANAGEMENT (Supabase) ====================
# Uses Supabase table 'chat_history' with columns: session_id (PK, text), history_json (jsonb)
CHAT_HISTORY_TABLE = "chat_history"

def load_chat_history(session_id):
    if not supabase: return []
    try:
        # Fetch history by session_id
        response = supabase.table(CHAT_HISTORY_TABLE).select("history_json").eq("session_id", session_id).single().execute()
        
        if response.data and response.data.get('history_json'):
            return response.data['history_json']
        return []
    except Exception as e:
        # Supabase raises an exception if single() returns no rows (i.e., new session)
        return []

def save_chat_history(session_id, history):
    if not supabase: return
    try:
        # Keep only the last 20 messages before saving
        history_to_save = history[-20:]
        
        data = {
            "session_id": session_id,
            "history_json": history_to_save
        }
        
        # Use upsert to insert or update the history
        # on_conflict="session_id" ensures it updates if session_id exists
        response = supabase.table(CHAT_HISTORY_TABLE).upsert(data, on_conflict="session_id").execute()
    except Exception as e:
        print(f"Supabase save chat history error: {e}")

# ==================== CONFIGURATION ====================
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("CLIENT_ID"),
        "project_id": os.getenv("PROJECT_ID"),
        "auth_uri": os.getenv("AUTH_URI"),
        "token_uri": os.getenv("TOKEN_URI"),
        "auth_provider_x509_cert_url": os.getenv("AUTH_PROVIDER_CERT_URL"),
        "client_secret": os.getenv("CLIENT_SECRET"),
        "redirect_uris": os.getenv("REDIRECT_URI")
    }
}

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TEMPORARY_FOLDER = "/tmp"
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = os.getenv("SMTP_PORT")
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# Domain keywords for analysis
KEYWORDS = {
    'data_analytics': ['Python', 'SQL', 'Tableau', 'Presto', 'Redshift', 'PySpark', 'Data Analysis', 'ETL', 'Dashboard'],
    'data_quality': ['Data Governance', 'Data Profiling', 'Data Validation', 'DQ Tools', 'Quality Metrics', 'Data Cleansing'],
    'machine_learning': ['Python', 'TensorFlow', 'PyTorch', 'Data Science', 'AI', 'Machine Learning', 'NLP', 'Keras'],
    'business_intelligence': ['Power BI', 'Tableau', 'Qlik', 'Looker', 'Data Visualization', 'KPIs', 'Metrics'],
    'cloud': ['AWS', 'Azure', 'GCP', 'DevOps', 'CI/CD', 'Kubernetes', 'Docker', 'Terraform']
}
EXCLUDE_SENDERS = ['noreply', 'do-not-reply', 'system', 'newsletter', 'notification', 'alert', 'auto']
RESUME_KEYWORDS = ['resume', 'cv', 'profile', 'biodata', 'application', 'job', 'candidate', 'bio data', 'my details', 'applying', 'seeking', 'submission']
EXCLUDE_KEYWORDS = ['manual', 'form', 'insurance', 'doc', 'brochure', 'lab', 'syllabus', 'report']

app = Flask(
    __name__,
    static_folder="../static",       # go one folder up to /static
    template_folder="../templates"   # go one folder up to /templates
)

app.secret_key = os.urandom(24)

# -------------------- Project storage helpers (Supabase) --------------------
PROJECTS_TABLE = "projects"

def load_projects():
    if not supabase: return []
    try:
        # Fetch all project data (id and the entire 'data' JSON blob)
        response = supabase.table(PROJECTS_TABLE).select("data").execute()
        
        # response.data is a list of dictionaries: [{'data': {...}}, ...]
        projects = [item['data'] for item in response.data if 'data' in item]
        return projects
    except Exception as e:
        print(f"Supabase failed to load projects: {e}")
        return []

def save_projects(projects):
    """Saves all projects by batch updating the Supabase table."""
    if not supabase: return False
    try:
        # Prepare data for Supabase upsert: list of {'id': project_id, 'data': project_object}
        data_to_save = []
        for p in projects:
            if p.get('id'):
                data_to_save.append({
                    'id': p['id'],
                    'data': p
                })

        # Upsert: insert or update based on 'id' conflict
        response = supabase.table(PROJECTS_TABLE).upsert(data_to_save, on_conflict="id").execute()
        
        if response.data:
            return True
        else:
            print(f"Supabase failed to save projects: {response}")
            return False
    except Exception as e:
        print(f"Supabase failed to save projects: {e}")
        return False

def find_project(project_id):
    if not supabase: return None
    try:
        # Fetch a single project by id
        response = supabase.table(PROJECTS_TABLE).select("data").eq("id", project_id).single().execute()
        
        if response.data and response.data.get('data'):
            return response.data['data']
        return None
    except Exception as e:
        # This handles the case where the project is not found (Supabase raises an exception if single() returns no rows)
        return None

def keep_top_resumes_for_project(project, top_n=3):
    resumes = project.get('resumes', [])
    def score(r):
        try:
            return int(r.get('sections', {}).get('ats_score') or 0)
        except Exception:
            return 0
    resumes_sorted = sorted(resumes, key=score, reverse=True)
    project['top_resumes'] = resumes_sorted[:top_n]
    return project

# ==================== GMAIL & RESUME PROCESSING LOGIC ====================
def get_llm():
    """Initializes and returns the Groq LLM instance."""
    try:
        return ChatGroq(
            groq_api_key=GROQ_API_KEY,
            model_name="llama-3.1-8b-instant",
            temperature=0.18
        )
    except Exception as e:
        print(f"Failed to initialize LLM: {str(e)}")
        return None

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True if successful."""
    try:
        msg = EmailMessage()
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        return False

def get_acceptance_email(candidate_name: str, job_title: str):
    """Generates the subject and body for an acceptance email."""
    subject = f"Congratulations {candidate_name} - Application Accepted!"
    body = f"""Dear {candidate_name},
We are pleased to inform you that your application for the position of {job_title} has been shortlisted. 🎉
Our HR team was impressed with your skills and background. We will be contacting you shortly with the next steps in the hiring process.
Best regards,  
HR Team
"""
    return subject, body

def get_rejection_email(candidate_name: str, job_title: str):
    """Generates the subject and body for a rejection email."""
    subject = f"Application Update - {job_title}"
    body = f"""Dear {candidate_name},
Thank you for applying for the position of {job_title}. We truly appreciate the time and effort you put into the application process.
After careful consideration, we regret to inform you that your profile has not been shortlisted at this stage. However, we encourage you to apply for future opportunities with us.
Best wishes,  
HR Team
"""
    return subject, body

def parse_email_from_sender(sender: str) -> str:
    """Extracts just the email address from a sender string."""
    if not sender:
        return ""
    match = re.search(r"<([^>]+)>", sender)
    if match:
        return match.group(1).strip()
    match2 = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", sender)
    if match2:
        return match2.group(0).strip()
    return sender.strip()

def infer_job_title_from_jd(job_description: str) -> str:
    """Tries to guess job title from the job description."""
    if not job_description:
        return "Applicant"
    jd = job_description.strip()
    m = re.search(r"position\s+(?:of|for)\s+([A-Za-z0-9 &\-+]+)", jd, flags=re.IGNORECASE)
    if m:
        return m.group(1).strip().splitlines()[0]
    m2 = re.search(r"looking for (an|a)?\s*([A-Za-z0-9 &\-+]+)", jd, flags=re.IGNORECASE)
    if m2:
        return m2.group(2).strip().splitlines()[0]
    first_line = jd.splitlines()[0]
    if len(first_line) < 80:
        return first_line[:80].strip()
    return "Applicant"

def get_timestamp_days_ago(days):
    """Calculates a timestamp from a number of days ago."""
    date_n_days_ago = datetime.now(UTC) - timedelta(days=days)
    return int(date_n_days_ago.timestamp())

def is_resume_file(filename, subject):
    """Checks if a file and subject match resume criteria."""
    name = (filename or "").lower()
    subject = (subject or "").lower()
    is_subject_ok = any(kw in subject for kw in RESUME_KEYWORDS)
    is_filename_ok = any(kw in name for kw in RESUME_KEYWORDS)
    is_excluded = any(kw in name for kw in EXCLUDE_KEYWORDS)
    return (is_subject_ok or is_filename_ok) and not is_excluded

def is_valid_sender(sender):
    """Checks if a sender is valid (not a noreply address)."""
    sender_lower = sender.lower()
    return not any(exclude in sender_lower for exclude in EXCLUDE_SENDERS)

def download_resumes_from_gmail(creds, days_filter=30, search_query=""):
    """Downloads resumes from Gmail as PDF attachments."""
    try:
        gmail_service = build('gmail', 'v1', credentials=creds)
        timestamp = get_timestamp_days_ago(days_filter)
        
        query = f'has:attachment filename:pdf after:{timestamp}'
        if search_query:
            query += f' "{search_query}"'
            
        results = gmail_service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])
        downloaded_files = []
        processed_senders = set()
        os.makedirs(TEMPORARY_FOLDER, exist_ok=True)
        
        for msg in messages[:20]:
            try:
                msg_data = gmail_service.users().messages().get(
                    userId='me', 
                    id=msg['id'], 
                    format='raw'
                ).execute()
                raw_msg = msg_data.get('raw')
                if not raw_msg:
                    continue
                if isinstance(raw_msg, str):
                    raw_msg = raw_msg.encode('ASCII')
                
                raw_msg = base64.urlsafe_b64decode(raw_msg)
                mime_msg = email.message_from_bytes(raw_msg, policy=email.policy.default)
                
                sender = mime_msg.get('From', '').lower()
                subject = mime_msg.get('Subject', '(No Subject)')

                if not is_valid_sender(sender) or sender in processed_senders:
                    continue
                processed_senders.add(sender)
                
                for part in mime_msg.walk():
                    filename = part.get_filename()
                    if filename and filename.lower().endswith('.pdf'):
                        if is_resume_file(filename, subject):
                            file_data = part.get_payload(decode=True)
                            sender_hash = hash(sender) % 10000
                            safe_filename = f"{sender_hash}_{filename}"
                            filepath = os.path.join(TEMPORARY_FOLDER, safe_filename)
                            if os.path.exists(filepath):
                                continue
                            with open(filepath, 'wb') as f:
                                f.write(file_data)
                            downloaded_files.append({
                                'filepath': filepath, 
                                'sender': sender, 
                                'subject': subject,
                                'original_filename': filename
                            })
                            
            except Exception as e:
                print(f"Skipping message due to error: {str(e)}")
                continue
        return downloaded_files
    except HttpError as e:
        print(f"Google API error: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return []

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file using PyMuPDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {str(e)}")
        return ""

def clean_text(text):
    """Cleans up text by removing extra whitespace."""
    return re.sub(r'\s+', ' ', text).strip()

def keyword_match(text):
    """Matches keywords in text against predefined domains."""
    matches = defaultdict(list)
    lower_text = text.lower()
    for domain, words in KEYWORDS.items():
        for kw in words:
            if kw.lower() in lower_text:
                matches[domain].append(kw)
    return dict(matches)

def extract_candidate_name(filepath):
    """Tries to extract a candidate name from a filename."""
    filename = os.path.basename(filepath)
    if '_' in filename and filename.split('_')[0].isdigit():
        filename = '_'.join(filename.split('_')[1:])
    name_no_ext = os.path.splitext(filename)[0]
    name_no_ext = re.sub(r'[_\- ]?\d{1,3}$', '', name_no_ext)
    candidate_name = " ".join([w.capitalize() for w in re.split(r'[_\- ]+', name_no_ext) if w])
    return candidate_name

def extract_contact_info(text):
    """Extracts email and phone number from resume text."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    email_val = emails[0] if emails else "Not found"
    phone_patterns = [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
        r'\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b',
        r'\b\d{10}\b',
        r'\b\+\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    ]
    phone = "Not found"
    for pattern in phone_patterns:
        phones = re.findall(pattern, text)
        if phones:
            phone = phones[0]
            break
    return email_val, phone

def generate_candidate_profile_hr(job_description, resume_text, matched_keywords, name, email, phone):
    """Generates an HR profile for a candidate using an LLM."""
    prompt = f"""
You are a senior HR analyst and technical recruiter. Your job is to analyze the resume evidence deeply and compare it with the job description, providing uniquely detailed, non-repetitive, and actionable HR insights. Use different evidence for each section and avoid repeating sentences or phrasing.
Inputs:
Job Description: {job_description}
Resume Text: {resume_text}
Matched Keywords: {json.dumps(matched_keywords, indent=2)}
Candidate Name: {name}
Candidate Email: {email}
Candidate Phone: {phone}

Output Format (use explicit section headers):
Basic Information:
- Name: {name}
- Email: {email}
- Phone: {phone}
- Total years of experience (estimate if not explicit)
- Highest education (if available)
- Most recent position and employer

Strengths & Weaknesses:
List 2-3 unique strengths and 2-3 unique weaknesses, each with distinct evidence from the resume (skills, projects, impact, achievements, missing skills, gaps, etc). Use this format:
- **Strength:** [evidence...]
- **Weakness:** [evidence...]

HR Summary & Justification:
Write a comprehensive, non-repetitive analysis (at least 3-5 lines, with specific, concrete resume evidence in each sentence), combining HR summary and justification. Start with a sub-heading **HR Summary:** and then a sub-heading **Justification:**, and then write the corresponding content for each. The HR Summary must be at least 4-6 lines, and should mention: domain expertise, technical proficiency, business acumen, teamwork, communication, project/role highlights, and unique strengths. Do not repeat phrases or evidence. The Justification must be at least 4-5 lines and reference project/role/skill evidence from the resume. Each major point must reference different evidence from the resume. Highlight both positive and negative aspects, and address business value, culture fit, and any observable upskilling or future potential.

Recommendation:
Provide a decisive recommendation in three clearly marked sections (each at least 2-3 sentences, all using different language/evidence than above):
- **Why Select This Candidate:** Reference at least two unique strengths from the resume.
- **Why Not Select This Candidate:** Reference at least two unique weaknesses or potential concerns from the resume.
- **Additional Future Potential:** Do a rigorous analysis across 6 dimensions:Growth Consistency – Is the candidate progressing logically (intern → associate → lead) or stagnating for years?
Career Trajectory – progression, direction consistency, job transition patterns.Expertise Depth – work complexity, skill evolution, impact metrics.Problem-Solving/Innovation – challenges solved, innovations, business value.Risk Indicators – flight risk, skill inflation, unusual patterns.Leadership/Influence – team impact, decision-making, leadership potential.Adaptability/Resilience – gap handling, crisis response, learning agility,make it small and clear and detail.

ATS Evaluation JSON:
A valid JSON array with 1 object in this format:
[{{
    "name": "{name}",
    "ats_score": "[0-100]",
    "hr_score": "[1-10]"
}}]

JD-Based Interview Questions & Resume Match Evaluation:
Generate 4-5 highly relevant, domain-specific interview questions based on the JD. For each, rate the resume's match: [Match level: Clear / Partial / Not Evident] — [Explanation, referencing a different project, skill, or achievement from the resume for each question.]

Your output must have these sections clearly separated, each detailed and actionable, with minimal repetition.
"""
    llm = get_llm()
    if not llm:
        return "LLM initialization failed"
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = llm.invoke(prompt)
            return response.content
        except Exception as e:
            if "rate_limit" in str(e).lower() or "429" in str(e):
                wait_time = (attempt + 1) * 5
                print(f"Rate limit reached. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
            else:
                return f"Error generating profile: {str(e)}"
    return "Failed to generate profile after multiple attempts"

def parse_hr_response_sections(response_text):
    """Parses the LLM response text into structured sections."""
    sections = {
        'basic_info': '', 'strengths_weaknesses': '', 'hr_summary_justification': '',
        'recommendation': '', 'ats_json': '', 'interview_questions': ''
    }
    text = response_text.strip()
    markers = [
        ("basic_info", "basic information"), ("strengths_weaknesses", "strengths & weaknesses"),
        ("hr_summary_justification", "hr summary & justification"), ("recommendation", "recommendation"),
        ("ats_json", "ats evaluation json"), ("interview_questions", "jd-based interview questions")
    ]
    positions = []
    for key, marker in markers:
        idx = text.lower().find(marker)
        if idx != -1:
            positions.append((idx, key, marker))
    positions.sort()
    for i, (idx, key, marker) in enumerate(positions):
        start = idx + len(marker)
        end = positions[i+1][0] if i+1 < len(positions) else len(text)
        content = text[start:end].strip(" :\n*")
        sections[key] = content
    if sections["ats_json"]:
        json_match = re.search(r'\[[\s\S]*\]', sections["ats_json"])
        if json_match:
            sections["ats_json"] = json_match.group(0)
    return sections

def extract_subsections_hr_summary_justification(text):
    """Splits the summary/justification section into two parts."""
    summary, justification = "", ""
    parts = re.split(r"\*\*HR Summary:\*\*|\*\*Justification:\*\*|HR Summary:|Justification:", text, flags=re.IGNORECASE)
    if len(parts) == 3:
        _, summary, justification = parts
    elif len(parts) == 2:
        if "summary" in text.lower():
            _, summary = parts
        else:
            _, justification = parts
    else:
        summary = text
    return summary.strip(), justification.strip()

def style_recommendation_subheadings(recommendation):
    """Adds markdown formatting to the recommendation subheadings."""
    rec_out = recommendation
    rec_out = re.sub(r"(?<!\*)\s*Why Select This Candidate\s*:(?!\*)", "\n\n**Why Select This Candidate:**", rec_out, flags=re.IGNORECASE)
    rec_out = re.sub(r"(?<!\*)\s*Why Not Select This Candidate\s*:(?!\*)", "\n\n**Why Not Select This Candidate:**", rec_out, flags=re.IGNORECASE)
    rec_out = re.sub(r"(?<!\*)\s*Additional Future Potential\s*:(?!\*)", "\n\n**Additional Future Potential:**", rec_out, flags=re.IGNORECASE)
    return rec_out

# ==================== FLASK ROUTES ====================
@app.route("/")
def index():
    try:
        return render_template("index.html")
    except Exception as e:
        return f"<h3>Error: Could not render index.html. Details: {e}</h3>"

@app.route("/authenticate")
def authenticate():
    """Start OAuth flow using web Flow"""
    flow = Flow.from_client_config(CLIENT_CONFIG, SCOPES)
    flow.redirect_uri = url_for("callback", _external=True)
    authorization_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true", prompt="consent")
    session['oauth_state'] = state
    return redirect(authorization_url)

@app.route("/callback")
def callback():
    state = session.get('oauth_state')
    if not state or state != request.args.get('state'):
        return jsonify({"error": "Authentication state lost."}), 400

    flow = Flow.from_client_config(CLIENT_CONFIG, SCOPES, state=state)
    flow.redirect_uri = url_for("callback", _external=True)

    try:
        flow.fetch_token(authorization_response=request.url)
    except Exception as e:
        return jsonify({"error": "Failed to fetch token", "details": str(e)}), 500

    creds = flow.credentials
    session['creds'] = creds.to_json()
    return redirect(url_for('auth_success'))

@app.route("/auth_success")
def auth_success():
    """Renders a success page that can be closed automatically."""
    return render_template("auth_callback.html")

@app.route("/fetch_resumes", methods=["POST"])
def fetch_resumes():
    if 'creds' not in session:
        return jsonify({"error": "Authentication required"}), 401
    
    if not supabase:
        return jsonify({"error": "Database connection failed. Supabase client is not initialized."}), 500

    try:
        creds = Credentials.from_authorized_user_info(json.loads(session['creds']), SCOPES)
    except Exception as e:
        return jsonify({"error": "Invalid stored credentials", "details": str(e)}), 401

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                session['creds'] = creds.to_json()
            except Exception as e:
                return jsonify({"error": "Failed to refresh token", "details": str(e)}), 401
        else:
            return jsonify({"error": "Authentication token expired or invalid. Please re-authenticate."}), 401

    data = request.json or {}
    job_description = data.get("job_description", "")
    job_role = data.get("job_role", "")
    days_filter = int(data.get("days_filter", 30))
    project_id = data.get('project_id')

    downloaded_resumes = download_resumes_from_gmail(creds, days_filter, job_role)

    if not downloaded_resumes:
        return jsonify({"message": "No new resumes found."})

    candidates = []
    
    current_project = find_project(project_id) if project_id else None
    projects = load_projects()
    
    for i, meta in enumerate(downloaded_resumes):
        filepath = meta.get("filepath")
        if not filepath or not os.path.exists(filepath):
            continue

        raw_text = extract_text_from_pdf(filepath)
        
        # --- File Storage Upload Logic (for Gmail fetched files) ---
        file_data_bytes = None
        try:
            with open(filepath, 'rb') as f:
                file_data_bytes = f.read()
        except Exception as e:
            print(f"Error reading local file before Supabase upload: {e}")
            os.remove(filepath)
            continue
        
        # Delete local temporary file immediately after reading its contents
        os.remove(filepath) 

        if not raw_text:
            continue

        # Generate unique path for Supabase Storage
        file_uuid = str(uuid.uuid4())
        # Use a generic path if no project is selected
        storage_path = f"{project_id or 'gmail_fetch'}/{file_uuid}_{meta.get('original_filename')}"
        
        try:
            # Upload file to Supabase Storage
            supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
                file=file_data_bytes,
                path=storage_path,
                file_options={"content-type": "application/pdf"}
            )
        except Exception as e:
            print(f"Supabase Storage upload failed for {meta.get('original_filename')}: {e}")
            continue # Skip this candidate if file upload fails

        cleaned_text = clean_text(raw_text)
        matched_keywords = keyword_match(cleaned_text)
        # Use meta data to reconstruct candidate name, as filepath is deleted
        candidate_name = extract_candidate_name(meta.get("original_filename")) 
        if not candidate_name or 'unknown' in candidate_name.lower():
            first_line = cleaned_text.splitlines()[0].strip() if cleaned_text else ""
            if first_line and len(first_line) < 60:
                candidate_name = first_line
            else:
                candidate_name = os.path.splitext(meta.get('original_filename', 'Unknown'))[0]

        email_from_sender = parse_email_from_sender(meta.get("sender", ""))
        email_from_text, phone_from_text = extract_contact_info(cleaned_text)
        candidate_email = email_from_sender or email_from_text
        candidate_phone = phone_from_text

        profile = generate_candidate_profile_hr(
            job_description, cleaned_text, matched_keywords,
            candidate_name, candidate_email, candidate_phone
        )

        if profile.startswith("Error") or profile.startswith("Failed") or profile == "LLM initialization failed":
            print(f"Failed to generate profile for {candidate_name}: {profile}")
            continue

        sections = parse_hr_response_sections(profile)
        summary, justification = extract_subsections_hr_summary_justification(sections.get("hr_summary_justification", ""))
        sections["hr_summary"] = summary
        sections["justification"] = justification
        sections["recommendation"] = style_recommendation_subheadings(sections.get("recommendation", ""))

        ats_score, hr_score = None, None
        try:
            ats_list = json.loads(sections.get("ats_json", "[]"))
            if ats_list and isinstance(ats_list[0], dict):
                ats_score = ats_list[0].get("ats_score")
                hr_score = ats_list[0].get("hr_score")
        except Exception as e:
            print(f"Could not parse ATS JSON for {candidate_name}: {e}")

        sections["ats_score"] = ats_score
        sections["hr_score"] = hr_score

        candidate_data = {
            "name": candidate_name, "email": candidate_email, "phone": candidate_phone,
            "filename": meta.get("original_filename", ""), "sender": meta.get("sender", ""),
            "subject": meta.get("subject", ""), "sections": sections,
            "storage_path": storage_path # New field to store Supabase Storage path
        }
        candidates.append(candidate_data)

    saved_project = None
    if current_project and candidates:
        # Update the project object in the 'projects' list
        for p in projects:
            if p.get('id') == project_id:
                for c in candidates:
                    p.setdefault('resumes', []).append({
                        'id': str(int(time.time() * 1000)) + str(random.randint(10,99)),
                        **c, 'uploaded_at': datetime.utcnow().isoformat() + 'Z'
                    })
                    p['stats']['total_uploaded'] = p['stats'].get('total_uploaded', 0) + 1
                p = keep_top_resumes_for_project(p, top_n=3)
                p['stats']['top_kept'] = len(p.get('top_resumes', []))
                saved_project = p
                break
        
        if saved_project:
            save_projects(projects)

    resp = {'candidates': candidates}
    if saved_project:
        resp['project'] = saved_project
    return jsonify(resp)

# -------------------- Project API endpoints --------------------
@app.route('/projects', methods=['GET'])
def list_projects():
    projects = load_projects()
    return jsonify({'projects': projects})

@app.route('/projects', methods=['POST'])
def create_project():
    if not supabase:
        return jsonify({"error": "Database connection failed."}), 500
        
    data = request.json or {}
    project_id = str(uuid.uuid4()) # Use UUID for better unique IDs
    project = {
        'id': project_id,
        'title': data.get('title') or 'New Recruitment',
        'description': data.get('description') or '',
        'owner': data.get('owner') or 'default',
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'resumes': [], 'top_resumes': [],
        'stats': {'total_uploaded': 0, 'top_kept': 0}
    }
    
    try:
        # Insert new project into Supabase
        response = supabase.table(PROJECTS_TABLE).insert({
            'id': project_id,
            'data': project
        }).execute()
        
        if response.data:
            return jsonify({'project': project}), 201
        else:
            return jsonify({'error': 'Supabase insert failed'}), 500
    except Exception as e:
        return jsonify({'error': f"Failed to create project in Supabase: {e}"}), 500

@app.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    project = find_project(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify({'project': project})

# --- NEW: Standalone Resume Upload Route (Called by frontend when no project is selected) ---
@app.route('/upload_resume', methods=['POST'])
def upload_resume_standalone():
    if not supabase:
        return jsonify({'error': 'Database connection failed.'}), 500

    if 'resume' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Ensure job_description is retrieved from form data
    job_description = request.form.get('job_description', '')
    if not job_description:
        return jsonify({'error': 'Job description is required for analysis.'}), 400

    filename = secure_filename(file.filename)
    
    # --- Step 1: Save temporarily for text extraction ---
    filepath = os.path.join(TEMPORARY_FOLDER, filename)
    os.makedirs(TEMPORARY_FOLDER, exist_ok=True)
    file.save(filepath)

    raw_text = extract_text_from_pdf(filepath)
    
    # --- Step 2: Upload to Supabase Storage ---
    # Since this is a standalone analysis (no project), we save it under a generic path
    file_data_bytes = None
    try:
        with open(filepath, 'rb') as f:
            file_data_bytes = f.read()
    except Exception as e:
        print(f"Error reading local file before Supabase upload: {e}")
        os.remove(filepath)
        return jsonify({'error': 'Could not read temporary file for storage upload'}), 500
        
    resume_uuid = str(uuid.uuid4())
    storage_path = f"standalone/{resume_uuid}_{filename}" # Generic standalone path
    
    try:
        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            file=file_data_bytes,
            path=storage_path,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        os.remove(filepath)
        print(f"Supabase Storage upload failed for {filename}: {e}")
        return jsonify({'error': f'Failed to store file in Supabase Storage: {e}'}), 500
        
    os.remove(filepath) # Delete temporary local file
    
    if not raw_text:
        return jsonify({'error': 'Could not extract text from PDF for analysis.'}), 500

    # --- Step 3: Run AI analysis and prepare metadata ---
    cleaned_text = clean_text(raw_text)
    matched_keywords = keyword_match(cleaned_text)
    candidate_name = extract_candidate_name(filepath)
    email_from_text, phone_from_text = extract_contact_info(cleaned_text)

    profile = generate_candidate_profile_hr(
        job_description, cleaned_text, matched_keywords,
        candidate_name, email_from_text, phone_from_text
    )

    if profile.startswith('Error') or profile.startswith('Failed') or profile == 'LLM initialization failed':
        print(f"Failed to generate profile for {candidate_name}: {profile}")
        return jsonify({'error': 'Failed to generate AI profile.'}), 500

    sections = parse_hr_response_sections(profile)
    summary, justification = extract_subsections_hr_summary_justification(sections.get('hr_summary_justification', ''))
    sections['hr_summary'] = summary
    sections['justification'] = justification
    sections['recommendation'] = style_recommendation_subheadings(sections.get('recommendation', ''))

    ats_score, hr_score = None, None
    try:
        ats_list = json.loads(sections.get('ats_json', '[]'))
        if ats_list and isinstance(ats_list[0], dict):
            ats_score = ats_list[0].get('ats_score')
            hr_score = ats_list[0].get('hr_score')
    except Exception as e:
        print(f"Could not parse ATS JSON for {candidate_name}: {e}")

    sections['ats_score'] = ats_score
    sections['hr_score'] = hr_score

    candidate = {
        'id': str(int(time.time() * 1000)) + str(random.randint(10,99)),
        'name': candidate_name, 'email': email_from_text, 'phone': phone_from_text,
        'filename': filename, 'sections': sections,
        'uploaded_at': datetime.utcnow().isoformat() + 'Z',
        'storage_path': storage_path # Store the Supabase Storage path
    }

    # Return the candidate data wrapped in a list for the frontend to handle
    return jsonify({'candidates': [candidate], 'message': 'Resume analyzed successfully.'})

@app.route('/projects/<project_id>/upload_resume', methods=['POST'])
def upload_resume_to_project(project_id):
    if not supabase:
        return jsonify({"error": "Database connection failed."}), 500
        
    project = find_project(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    if 'resume' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    job_description = request.form.get('job_description', project.get('description', ''))
    if not job_description:
        return jsonify({'error': 'Job description is required'}), 400

    filename = secure_filename(file.filename)
    
    # --- Step 1: Save temporarily for text extraction ---
    filepath = os.path.join(TEMPORARY_FOLDER, filename)
    os.makedirs(TEMPORARY_FOLDER, exist_ok=True)
    file.save(filepath)

    raw_text = extract_text_from_pdf(filepath)
    
    # --- Step 2: Upload to Supabase Storage ---
    file_data_bytes = None
    try:
        with open(filepath, 'rb') as f:
            file_data_bytes = f.read()
    except Exception as e:
        print(f"Error reading local file before Supabase upload: {e}")
        # Clean up local file even if storage fails
        os.remove(filepath)
        return jsonify({'error': 'Could not read temporary file for storage upload'}), 500
        
    # Generate unique path
    resume_uuid = str(uuid.uuid4())
    storage_path = f"{project_id}/{resume_uuid}_{filename}"
    
    try:
        supabase.storage.from_(SUPABASE_BUCKET_NAME).upload(
            file=file_data_bytes,
            path=storage_path,
            file_options={"content-type": "application/pdf"}
        )
    except Exception as e:
        # Clean up local file even if storage fails
        os.remove(filepath)
        print(f"Supabase Storage upload failed for {filename}: {e}")
        return jsonify({'error': f'Failed to store file in Supabase Storage: {e}'}), 500
        
    # --- Step 3: Delete temporary local file ---
    os.remove(filepath) 

    if not raw_text:
        # File is saved in storage, but analysis failed.
        return jsonify({'error': 'Could not extract text from PDF for analysis. File saved to storage.'}), 500

    # --- Step 4: Run AI analysis and prepare metadata ---
    cleaned_text = clean_text(raw_text)
    matched_keywords = keyword_match(cleaned_text)
    candidate_name = extract_candidate_name(filepath) # filepath is filename only here
    email_from_text, phone_from_text = extract_contact_info(cleaned_text)

    profile = generate_candidate_profile_hr(
        job_description, cleaned_text, matched_keywords,
        candidate_name, email_from_text, phone_from_text
    )

    if profile.startswith('Error') or profile.startswith('Failed') or profile == 'LLM initialization failed':
        print(f"Failed to generate profile for {candidate_name}: {profile}")
        return jsonify({'error': 'Failed to generate AI profile.'}), 500

    sections = parse_hr_response_sections(profile)
    summary, justification = extract_subsections_hr_summary_justification(sections.get('hr_summary_justification', ''))
    sections['hr_summary'] = summary
    sections['justification'] = justification
    sections['recommendation'] = style_recommendation_subheadings(sections.get('recommendation', ''))

    ats_score, hr_score = None, None
    try:
        ats_list = json.loads(sections.get('ats_json', '[]'))
        if ats_list and isinstance(ats_list[0], dict):
            ats_score = ats_list[0].get('ats_score')
            hr_score = ats_list[0].get('hr_score')
    except Exception as e:
        print(f"Could not parse ATS JSON for {candidate_name}: {e}")

    sections['ats_score'] = ats_score
    sections['hr_score'] = hr_score

    candidate = {
        'id': str(int(time.time() * 1000)) + str(random.randint(10,99)),
        'name': candidate_name, 'email': email_from_text, 'phone': phone_from_text,
        'filename': filename, 'sections': sections,
        'uploaded_at': datetime.utcnow().isoformat() + 'Z',
        'storage_path': storage_path # Store the Supabase Storage path
    }

    # --- Step 5: Update project metadata in Supabase Database ---
    projects = load_projects()
    updated_project = None
    for p in projects:
        if p.get('id') == project_id:
            p.setdefault('resumes', []).append(candidate)
            p['stats']['total_uploaded'] = p['stats'].get('total_uploaded', 0) + 1
            p = keep_top_resumes_for_project(p, top_n=3)
            p['stats']['top_kept'] = len(p.get('top_resumes', []))
            updated_project = p
            break
    
    if save_projects(projects):
        return jsonify({'candidate': candidate, 'project': updated_project})
    else:
        return jsonify({'error': 'Failed to save project data to database after successful upload.'}), 500


@app.route('/projects/<project_id>/resumes/<resume_id>', methods=['DELETE'])
def delete_resume_from_project(project_id, resume_id):
    if not supabase:
        return jsonify({"error": "Database connection failed."}), 500
        
    projects = load_projects()
    found = False
    updated_project = None
    storage_path_to_delete = None
    
    for p in projects:
        if p.get('id') == project_id:
            resumes = p.get('resumes', [])
            
            # Find the resume to get the storage_path
            resume_to_delete = next((r for r in resumes if r.get('id') == resume_id), None)
            if resume_to_delete:
                storage_path_to_delete = resume_to_delete.get('storage_path')

            new_resumes = [r for r in resumes if r.get('id') != resume_id]
            
            if len(new_resumes) != len(resumes):
                p['resumes'] = new_resumes
                p = keep_top_resumes_for_project(p, top_n=3)
                p['stats']['total_uploaded'] = max(0, p['stats'].get('total_uploaded', 0) - 1)
                p['stats']['top_kept'] = len(p.get('top_resumes', []))
                found = True
                updated_project = p
            break
            
    if not found:
        return jsonify({'error': 'Resume not found in project'}), 404
        
    # Update the project metadata in the Supabase Database
    if save_projects(projects):
        # Delete file from Supabase Storage (optional, but good practice)
        if storage_path_to_delete:
            try:
                # The remove method takes a list of paths
                supabase.storage.from_(SUPABASE_BUCKET_NAME).remove([storage_path_to_delete])
            except Exception as e:
                print(f"Warning: Failed to delete file from Supabase Storage ({storage_path_to_delete}): {e}")
                
        return jsonify({'success': True, 'project': updated_project}), 200
    else:
        return jsonify({'error': 'Failed to update project data in database'}), 500


@app.route("/send_email", methods=["POST"])
def send_email_route():
    data = request.json or {}
    candidate_email = data.get("email")
    candidate_name = data.get("name")
    job_description = data.get("job_description")
    email_type = data.get("type")

    if not all([candidate_email, candidate_name, job_description, email_type]):
        return jsonify({"success": False, "message": "Missing required data."}), 400

    job_title = infer_job_title_from_jd(job_description)

    if email_type == "accept":
        subject, body = get_acceptance_email(candidate_name, job_title)
    elif email_type == "reject":
        subject, body = get_rejection_email(candidate_name, job_title)
    else:
        return jsonify({"success": False, "message": "Invalid email type."}), 400

    if send_email(candidate_email, subject, body):
        return jsonify({"success": True, "message": f"{email_type.capitalize()} email sent successfully!"})
    else:
        return jsonify({"success": False, "message": "Failed to send email."})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "")
    if not user_message:
        return jsonify({"response": "Please provide a message."})

    session_id = session.get('chat_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        session['chat_session_id'] = session_id
    chat_history = load_chat_history(session_id)

    llm = get_llm()
    if not llm:
        return jsonify({"response": "I'm sorry, my AI assistant is currently unavailable."})

    system_prompt = """
    Introlligent Assistant Rules
    Role: Support job seekers & recruiters with concise, structured answers.
    Features: Resume evaluation | Gmail resume fetch | ATS scoring | JD optimization | Networking support.
    Style: Use bullets/short sentences | Professional & friendly | Clear, direct | No long paragraphs.
    Constraints: Only Introlligent features | Keep brief & targeted | Prioritize clarity.
    Job Description Prompting: If a user asks for a JD, always ask for: Years of experience, Notice period constraints, Location, Salary range.
    """
    
    keyword = user_message.strip().lower()
    if keyword == "help":
        script = (
            "How can I assist you?\n\n"
            "**Resume Fetch & Evaluation Guide:**\n"
            "1. **Enter Job Description:** Be specific about the role, skills, and experience.\n"
            "2. **Click 'Fetch Resumes from Gmail':** This starts the process.\n"
            "3. **Google Login:** A window will open for you to sign in.\n"
            "4. **Grant Permissions:** Allow the app to read emails and attachments securely.\n"
            "5. **View Evaluations:** See AI-powered analysis with scores and interview questions.\n\n"
            "**Other Features:**\n"
            "- **Resume Upload:** Manually upload a PDF for analysis.\n"
            "- **ATS Scoring:** See how well a resume matches your job.\n"
            "- **JD Optimization:** Get tips to improve your job descriptions."
        )
    elif keyword == "devops team":
        script = (
            "**DevOps Team Support**\n\n"
            "- Manages CI/CD pipelines, automation, and infrastructure monitoring.\n"
            "- Ensures high availability, scalability, and security.\n"
            "- Tools: Jenkins, Docker, Kubernetes, Terraform, Azure DevOps, AWS, GCP."
        )
    elif keyword == "ml team":
        script = (
            "**Machine Learning (ML) Team Support**\n\n"
            "- Builds, trains, and deploys machine learning models.\n"
            "- Handles data preprocessing, feature engineering, and model evaluation.\n"
            "- Tools: Python, TensorFlow, PyTorch, scikit-learn, and cloud ML platforms."
        )
    else:
        script = None

    if script is not None:
        chat_history.append({"role": "user", "content": user_message})
        chat_history.append({"role": "assistant", "content": script})
        save_chat_history(session_id, chat_history)
        return jsonify({"response": script})

    messages = [{"role": "system", "content": system_prompt}]
    for m in chat_history[-18:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        response = llm.invoke(messages)
        assistant_reply = response.content
        chat_history.append({"role": "user", "content": user_message})
        chat_history.append({"role": "assistant", "content": assistant_reply})
        save_chat_history(session_id, chat_history)
        return jsonify({"response": assistant_reply})
    except Exception as e:
        print(f"Error during chat: {e}")
        return jsonify({"response": "I'm sorry, I encountered an error. Please try again later."})


if __name__ == "__main__":
    app.run(debug=True)
