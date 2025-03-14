# CrimeMiner: “AI Investigative Partner” Requirements Prompt

## 1. WHY - Vision & Purpose

### A. Purpose & Users

1. **Primary Goal**

   - CrimeMiner must solve the problem of law enforcement being unable to process massive volumes of audio, video, and text. It should surface valuable intelligence quickly, preventing future crimes and closing current cases.

   - The system is intended to handle **thousands of years’ worth** of multimedia, helping investigators see evidence otherwise lost in the shuffle.

2. **Target Users**

   - **Detectives, Analysts, Prosecutors, Military, FBI, DEA**—essentially any law enforcement personnel needing to sift through vast troves of digital evidence.

   - Roles include **frontline investigators** (who upload/view data) and **supervisors** (who oversee and manage multiple cases).

3. **Value Proposition**

   - CrimeMiner will be the **all-in-one investigative assistant** that processes any media (audio/video/text/images) and provides actionable insights.

   - Differentiator: Incorporates an **“investigative agent”** that not only transcribes and indexes data but also converses with investigators to uncover hidden patterns and connections.

4. **Scope & Scale**

   - Must be usable by **local, state, and federal agencies**.

   - Should handle **thousands** of concurrent investigations—scaling into **millions** if needed.

5. **Vision for the Future (1–3 Years)**

   - CrimeMiner evolves into a system so efficient that a **handful of officers** can manage evidence for a large metropolitan area (e.g., Chicago).

   - Continually automates more investigative “leg work,” freeing up human resources for higher-level strategic tasks.

----------

## 2. WHAT - Core Requirements

### A. Functional Requirements

1. **Data Ingestion**

   - **System must** ingest **all media formats**: audio (WAV, MP3, etc.), video (MP4, AVI, etc.), images (JPEG, PNG, etc.), text/PDF, etc.

   - Must support both **manual uploads** and **API-driven bulk ingestion** from external systems.

2. **Processing & Analysis**

   - **System must** perform:

     - **Speech-to-Text** (high accuracy, multi-language)

     - **Face Recognition** (when legally permissible)

     - **Object Detection** (weapons, vehicles, etc.)

     - **Sentiment Analysis & Context Mapping**

     - **Coded Language Detection** (recognize words used out of normal context)

     - **Entity & Link Analysis** (map relationships among suspects, addresses, phone numbers)

   - Must allow **bulk/batch processing** (e.g., thousands of files in one go).

3. **Search & Discovery**

   - **System must** offer:

     - **Keyword/Boolean Search**

     - **Advanced Filters** by time, speaker, location, etc.

     - **Semantic or Conversational Search** (investigators can ask open-ended questions and receive narrative responses).

     - **Entity Relationship Mapping** (network graphs)

     - **Behavior / Anomaly Detection** (suspicious patterns or outlier language)

4. **Alerts & Notifications**

   - Investigators can **opt in** to receive alerts on specific cases or keywords.

   - Alerts trigger on:

     - Certain **keywords/phrases** (e.g., “kill,” “rob,” “escape”)

     - **Suspicious language** or abnormal context

     - Coded language patterns or new names/phrases

5. **Collaboration & Reporting**

   - **System must** support:

     - Annotation of transcripts or media (highlight, comment).

     - **Case-sharing** with permission-based access.

     - **Reporting** (summaries, timeline generation, automated transcripts).

6. **Security & Compliance**

   - Must provide **audit trails**, chain-of-custody logs, and versioning so evidence is defensible in court.

   - Must handle **redactions** (face-blurring, beep-out of sensitive info) and privacy constraints.

   - Must adhere to **CJIS** and **FedRAMP** requirements for data security.

7. **Other Must-Have Capabilities**

   - **Foreign Language Translation** (multiple languages)

   - **Speaker Identification** (tag known suspects’ voices, if legally allowed)

   - **License Plate Recognition** (from dashcam or surveillance footage)

   - **Local Contextual Data**: Agencies can upload custom data to enhance model accuracy (local slang, street names, known persons, etc.).

### B. Desired Outcomes

1. **End-User Experience**

   - “Success” = Investigators can upload massive quantities of multimedia (thousands of hours of calls, interviews, surveillance, plus gigabytes of text) and quickly identify **any** relevant evidence for current and potential future crimes.

   - Key metrics/KPIs:

     - **Time Saved** (investigations closed faster)

     - **Number of Cases Closed**

     - **Impact on Crime Stats** (reduced recidivism, more arrests, etc.)

2. **System Performance**

   - **Must** process large volumes at scale:

     - E.g., 1,000 jail phone calls (\~15 min each) in 3–10 minutes with **≥95%** transcription accuracy.

   - Must handle **8+ million minutes** of monthly jail phone calls in near real-time or in scheduled bulk.

----------

## 3. HOW - Planning & Implementation

### A. Technical Implementation

1. **Architecture & Stack**

   - **Frontend**: Web and mobile apps; prefer frameworks that are FedRAMP-friendly (React, Angular, Vue, etc.).

   - **Backend**: Flexible—could use SQL/NoSQL + Elasticsearch (for search), or a combination.

   - Provide APIs for integration with case management tools.

2. **Infrastructure & Deployment**

   - **Cloud-based** (AWS or Azure), possibly multi-region for redundancy.

   - Must support **high availability**, **fault tolerance**, and scale horizontally for large workloads.

   - Real-time and batch ingestion modes.

3. **Integrations**

   - **AI/ML APIs**: Offer a choice of speech recognition, translation, or image analysis models (Azure Cognitive Services, AWS Rekognition, or custom).

   - **Case Management Systems**: Two-way integration for seamless data exchange.

   - Minimally reliant on on-prem hardware; use GPU-enabled cloud instances for AI processing if needed.

4. **Performance & Scalability**

   - Must handle thousands of files concurrently without system lag.

   - Peak loads may occur during major operations (e.g., large jail call dumps).

   - Should have autoscaling policies to handle surges.

5. **Security & Compliance**

   - Adhere to **FedRAMP** and **CJIS** guidelines (encryption at rest and in transit, strict access control, logging, etc.).

   - Real-time backups, disaster recovery, offline export if needed.

6. **Reliability & Backup**

   - Must have near-instant failover for critical systems.

   - Data loss is catastrophic; ensure robust backups and replication.

### B. User Experience

1. **Key User Flows (Proposed)**

   - **Case Creation**: Investigator logs in (MFA/SSO) → “Create Case” → enters case name, description, search keywords/phrases → invites collaborators.

   - **Bulk Media Upload**: Investigator selects or drags-and-drops multiple files (audio, video, text). The system auto-classifies file types and begins ingestion.

   - **Automated Processing**: Once uploaded, CrimeMiner automatically transcribes/analyses each file, linking recognized entities (people, addresses, weapons).

   - **Dashboard & Alerts**: Investigator sees a real-time “Processing Progress” bar. Alerts pop up if high-priority keywords appear (e.g., “escape,” “kill,” or new suspect name).

   - **Search & Discovery**: Investigator can ask the system: “Show me all calls where suspect mentions ‘rendezvous’ or coded language.” System returns a conversation-like answer with timestamp highlights.

   - **Review & Annotation**: Investigator listens to key timestamps, adds notes, flags important quotes or faces.

   - **Reporting**: Investigator clicks “Generate Report,” which includes transcripts, flagged moments, timeline of events, and relevant evidence items.

2. **Core Interfaces**

   - **Dashboard**: List of active cases, status of media processing, real-time alerts/notifications.

   - **Case View**: Detailed transcripts, search results, entity links, and comments.

   - **Analytics/Insights**: Network graphs, trends, anomaly detection outputs.

   - **Reports**: Summaries, timelines, auto-generated or custom.

3. **Multi-Role Support**

   - **Detective/Investigator**: Main user—uploads, reviews transcripts, adds annotations.

   - **Supervisor/Administrator**: Manages user permissions, oversees multiple cases, configures alert rules.

   - Access is restricted so investigators only see cases/data they’re explicitly granted.

### C. Business Requirements

1. **Access & Authentication**

   - **SSO** and **MFA** must be supported.

   - Investigators can only view data for their assigned cases or as granted by a supervisor.

2. **Compliance & Legal Considerations**

   - Must comply with **CJIS, FedRAMP**.

   - Should include eDiscovery or FOIA request mechanisms (e.g., export relevant transcripts/evidence).

3. **Billing & Licensing**

   - Agencies license CrimeMiner on a **subscription basis**, with usage tracking (e.g., hours of transcription, total storage used).

4. **Business Rules**

   - Must reference raw data (original files) for chain-of-custody.

   - Generate **unofficial** evidence logs or case audit reports for internal use.

### D. Implementation Priorities

1. **High Priority (MVP)**

   - **Scalable Audio Processing**: The ability to handle **8+ million minutes** of jail phone calls per month.

   - **Accurate Speech-to-Text** (≥95%) with large-scale concurrent processing.

   - **Basic Text/Media Search & Alerts** (including simple entity recognition, coded language detection).

2. **Medium Priority**

   - **Video Object Detection** (detect weapons, suspicious behavior, etc.).

   - Enhanced user-interface features (more robust analytics dashboards, timeline visualizations).

3. **Low Priority / Future Considerations**

   - **Facial Recognition** & **License Plate Readers**

   - Deeper integration with local databases (e.g., local offender data, city watch-lists).

   - More advanced automated link analysis or “crime forecasting.”

----------

## Additional Notes

- **Non-Negotiables**: CJIS & FedRAMP compliance, near-real-time or batch ingestion for massive volumes, robust chain-of-custody tracking.

- **Example Workflow** (e.g., homicide investigation):

  1. Investigator creates a new “Homicide Case #XYZ.”

  2. Uploads hours of suspect jail phone calls, relevant surveillance videos, and text conversations from phone extractions.

  3. CrimeMiner transcribes and analyzes all media, flags suspicious references to specific locations (“Warehouse on 5th Street”) or new names.

  4. Investigator sees an alert that the suspect repeatedly mentioned “pickup” with coded references to “tools” (interpreted as weapons).

  5. Investigators cross-check metadata, discover matching references in multiple calls.

  6. Supervisor exports a timeline report for the District Attorney, highlighting relevant calls, timestamps, and transcripts.