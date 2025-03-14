# CrimeMiner AI Database Schema

This document outlines the database schema for the CrimeMiner AI platform, with a focus on the case management system and reference system.

## Core Models

### User
Represents system users (investigators, analysts, administrators)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| username | String | Unique username |
| email | String | User's email address |
| password_hash | String | Hashed password |
| first_name | String | User's first name |
| last_name | String | User's last name |
| role | Enum | User role (admin, investigator, analyst) |
| created_at | DateTime | Account creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Case
Represents an investigation case that contains multiple evidence files

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | String | Case title |
| description | Text | Case description |
| case_number | String | Official case number |
| status | Enum | Case status (open, closed, archived) |
| created_by | UUID | Reference to User who created the case |
| assigned_to | UUID[] | References to Users assigned to the case |
| created_at | DateTime | Case creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Evidence
Represents a single evidence file uploaded to the system

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| case_id | UUID | Reference to parent Case |
| title | String | Evidence title |
| description | Text | Evidence description |
| file_path | String | Path to the stored file |
| file_type | Enum | Type of file (audio, video, text, image, document) |
| file_size | Integer | Size of file in bytes |
| mime_type | String | MIME type of the file |
| md5_hash | String | MD5 hash of the file for integrity |
| metadata | JSON | Additional metadata about the file |
| tags | String[] | Tags for categorization |
| uploaded_by | UUID | Reference to User who uploaded the file |
| created_at | DateTime | Upload timestamp |
| updated_at | DateTime | Last update timestamp |

### AnalysisJob
Represents a processing job for evidence analysis

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| evidence_id | UUID | Reference to Evidence being analyzed |
| job_type | Enum | Type of analysis (transcription, entity_extraction, etc.) |
| status | Enum | Job status (queued, processing, completed, failed) |
| progress | Float | Progress percentage (0-100) |
| started_at | DateTime | Job start timestamp |
| completed_at | DateTime | Job completion timestamp |
| error | Text | Error message if job failed |
| created_by | UUID | Reference to User who initiated the job |
| created_at | DateTime | Job creation timestamp |
| updated_at | DateTime | Last update timestamp |

### AnalysisResult
Represents the results of an analysis job

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| job_id | UUID | Reference to AnalysisJob |
| evidence_id | UUID | Reference to Evidence |
| result_type | Enum | Type of result (entity, summary, sentiment, pattern) |
| content | JSON | The analysis result content |
| confidence | Float | Confidence score (0-1) |
| created_at | DateTime | Result creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Reference
Represents a specific location in a source file where evidence was found

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| result_id | UUID | Reference to AnalysisResult |
| evidence_id | UUID | Reference to Evidence |
| reference_type | Enum | Type of reference (timestamp, page, coordinate) |
| start_position | String | Start position in the source file |
| end_position | String | End position in the source file |
| context | Text | Surrounding context of the reference |
| created_at | DateTime | Reference creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Entity
Represents a named entity extracted from evidence

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Entity name |
| entity_type | Enum | Type of entity (person, location, organization, date, etc.) |
| aliases | String[] | Alternative names for the entity |
| created_at | DateTime | Entity creation timestamp |
| updated_at | DateTime | Last update timestamp |

### EntityOccurrence
Represents an occurrence of an entity in evidence

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| entity_id | UUID | Reference to Entity |
| result_id | UUID | Reference to AnalysisResult |
| reference_id | UUID | Reference to Reference |
| confidence | Float | Confidence score (0-1) |
| created_at | DateTime | Occurrence creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Note
Represents user notes attached to cases, evidence, or analysis results

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| content | Text | Note content |
| case_id | UUID | Optional reference to Case |
| evidence_id | UUID | Optional reference to Evidence |
| result_id | UUID | Optional reference to AnalysisResult |
| created_by | UUID | Reference to User who created the note |
| created_at | DateTime | Note creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Relationships

1. **User to Case**: One-to-many (a user can create multiple cases)
2. **Case to Evidence**: One-to-many (a case can have multiple evidence files)
3. **Evidence to AnalysisJob**: One-to-many (an evidence file can have multiple analysis jobs)
4. **AnalysisJob to AnalysisResult**: One-to-many (a job can produce multiple results)
5. **AnalysisResult to Reference**: One-to-many (a result can have multiple references to source locations)
6. **Entity to EntityOccurrence**: One-to-many (an entity can occur in multiple places)
7. **User to Note**: One-to-many (a user can create multiple notes)

## Indexes

- User: username, email
- Case: case_number, created_by, status
- Evidence: case_id, file_type, tags
- AnalysisJob: evidence_id, status
- AnalysisResult: job_id, evidence_id, result_type
- Reference: result_id, evidence_id, reference_type
- Entity: name, entity_type
- EntityOccurrence: entity_id, result_id, reference_id
- Note: case_id, evidence_id, result_id, created_by

## Implementation Notes

1. **Storage Strategy**:
   - Evidence files will be stored on the filesystem with paths recorded in the database
   - Large result sets will be stored as JSON in the database
   - Consider moving to object storage for scalability

2. **Versioning**:
   - Add versioning for evidence files if they are processed or modified
   - Track changes to analysis results over time

3. **Performance Considerations**:
   - Implement caching for frequently accessed results
   - Consider partitioning for large cases with many evidence files
   - Use database transactions for related operations

4. **Security**:
   - Implement row-level security for case access
   - Encrypt sensitive evidence and results
   - Maintain detailed audit logs for all operations

## Next Steps

1. Implement the core models (User, Case, Evidence)
2. Create API endpoints for CRUD operations
3. Develop the reference system for tracking evidence locations
4. Implement the job queue system for batch processing 

## Core Tables

### Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  role VARCHAR(20) NOT NULL,
  department VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

### Cases

```sql
CREATE TABLE cases (
  id UUID PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,
  priority VARCHAR(20),
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP
);
```

### Evidence Files

```sql
CREATE TABLE evidence_files (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  hash VARCHAR(255),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending',
  metadata JSONB
);
```

### Tags

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Evidence Tags

```sql
CREATE TABLE evidence_tags (
  evidence_id UUID REFERENCES evidence_files(id),
  tag_id UUID REFERENCES tags(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (evidence_id, tag_id)
);
```

## Reference System Tables

### References

```sql
CREATE TABLE references (
  id UUID PRIMARY KEY,
  evidence_id UUID REFERENCES evidence_files(id) NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  location JSONB NOT NULL,
  context JSONB,
  confidence FLOAT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

The `location` JSONB field will store different location information based on the file type:
- Text files: `{ "lineNumber": 42, "charPosition": 10 }`
- Audio files: `{ "startTime": 123.45, "endTime": 126.78 }`
- Video files: `{ "startTime": 123.45, "endTime": 126.78, "frameStart": 3704, "frameEnd": 3803 }`
- Images: `{ "x": 100, "y": 200, "width": 50, "height": 30 }`
- PDF: `{ "page": 5, "x": 100, "y": 200, "width": 50, "height": 30 }`

The `context` JSONB field will store context information:
- Text files: `{ "entity": "John Smith", "type": "PERSON", "context": "...surrounding text..." }`
- Audio files: `{ "entity": "John Smith", "type": "PERSON", "segmentText": "...transcript segment..." }`

### Entities

```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  case_id UUID REFERENCES cases(id),
  normalized_text VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Entity References

```sql
CREATE TABLE entity_references (
  entity_id UUID REFERENCES entities(id),
  reference_id UUID REFERENCES references(id),
  confidence FLOAT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity_id, reference_id)
);
```

### Analysis Results

```sql
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  evidence_id UUID REFERENCES evidence_files(id),
  analysis_type VARCHAR(50) NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Batch Processing Tables

### Batch Jobs

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY,
  case_id UUID REFERENCES cases(id),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  progress FLOAT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT,
  parameters JSONB
);
```

### Job Items

```sql
CREATE TABLE job_items (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES batch_jobs(id),
  evidence_id UUID REFERENCES evidence_files(id),
  status VARCHAR(20) NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes

```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Cases
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);

-- Evidence Files
CREATE INDEX idx_evidence_files_case_id ON evidence_files(case_id);
CREATE INDEX idx_evidence_files_file_type ON evidence_files(file_type);
CREATE INDEX idx_evidence_files_processing_status ON evidence_files(processing_status);
CREATE INDEX idx_evidence_files_uploaded_by ON evidence_files(uploaded_by);

-- References
CREATE INDEX idx_references_evidence_id ON references(evidence_id);
CREATE INDEX idx_references_reference_type ON references(reference_type);

-- Entities
CREATE INDEX idx_entities_text ON entities(text);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_case_id ON entities(case_id);

-- Batch Jobs
CREATE INDEX idx_batch_jobs_case_id ON batch_jobs(case_id);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_job_type ON batch_jobs(job_type);

-- Job Items
CREATE INDEX idx_job_items_job_id ON job_items(job_id);
CREATE INDEX idx_job_items_evidence_id ON job_items(evidence_id);
CREATE INDEX idx_job_items_status ON job_items(status);
```

## Relationships

- A **User** can create multiple **Cases**
- A **Case** can have multiple **Evidence Files**
- An **Evidence File** can have multiple **References**
- A **Reference** can be linked to multiple **Entities** through **Entity References**
- A **Batch Job** can process multiple **Evidence Files** through **Job Items**
- An **Evidence File** can have multiple **Tags** through **Evidence Tags**

## Notes on Implementation

1. Use UUIDs for all primary keys to ensure uniqueness across distributed systems
2. Store file paths rather than binary data in the database
3. Use JSONB for flexible metadata and location information
4. Implement proper indexing for performance optimization
5. Use foreign key constraints to maintain data integrity
6. Implement triggers for updating timestamps 