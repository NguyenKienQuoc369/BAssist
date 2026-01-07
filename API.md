# API Documentation

Base URL: `https://your-domain.vercel.app` or `http://localhost:3000` (development)

All endpoints accept and return JSON data.

## Endpoints

### 1. Study Buddy - Summarize Text

**Endpoint:** `POST /api/study-buddy`

**Description:** Summarizes text or PDF content into key points and main ideas.

**Request Body:**
```json
{
  "text": "Your long text content here..."
}
```

**Response:**
```json
{
  "success": true,
  "summary": "AI-generated summary...",
  "original_length": 1000,
  "summary_length": 250
}
```

**Example:**
```javascript
const response = await fetch('/api/study-buddy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Your text to summarize...'
  })
});
const data = await response.json();
```

---

### 2. Polisher - Business English Rewriting

**Endpoint:** `POST /api/polisher`

**Description:** Rewrites text to be more professional and suitable for business communication.

**Request Body:**
```json
{
  "text": "Text you want to make professional..."
}
```

**Response:**
```json
{
  "success": true,
  "original": "Original text...",
  "polished": "Professional version..."
}
```

**Example:**
```javascript
const response = await fetch('/api/polisher', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'hey can u send me that report?'
  })
});
```

---

### 3. Shark Tank - Investor Q&A

**Endpoint:** `POST /api/shark-tank`

**Description:** Simulates investor feedback and questions for business pitches.

**Request Body:**
```json
{
  "question": "Your pitch or question...",
  "context": "Optional business context..." // Optional field
}
```

**Response:**
```json
{
  "success": true,
  "question": "Your question...",
  "investor_response": "Investor feedback and questions..."
}
```

**Example:**
```javascript
const response = await fetch('/api/shark-tank', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    question: 'I have a subscription box for pet owners...',
    context: 'Currently have 100 subscribers, $5k MRR'
  })
});
```

---

### 4. Subject Vault - RAG Knowledge Storage

**Endpoint:** `POST /api/subject-vault`

**Description:** Store documents and query them using RAG (Retrieval-Augmented Generation).

#### Store a Document

**Request Body:**
```json
{
  "text": "Document content to store...",
  "query": null // or omit this field
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document added to Subject Vault",
  "document_id": 0,
  "total_documents": 1
}
```

#### Query the Vault

**Request Body:**
```json
{
  "text": "", // Can be empty when querying
  "query": "Your question about stored documents..."
}
```

**Response:**
```json
{
  "success": true,
  "query": "Your question...",
  "answer": "AI-generated answer based on stored documents...",
  "sources_used": 3
}
```

**Example - Store:**
```javascript
await fetch('/api/subject-vault', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Machine learning is a subset of AI...'
  })
});
```

**Example - Query:**
```javascript
const response = await fetch('/api/subject-vault', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '',
    query: 'What is machine learning?'
  })
});
```

---

### 5. Fact Check - Verify Information

**Endpoint:** `POST /api/fact-check`

**Description:** Verifies claims and statements using Google Search grounding.

**Request Body:**
```json
{
  "text": "Statement or claim to verify..."
}
```

**Response:**
```json
{
  "success": true,
  "claim": "Original claim...",
  "fact_check_result": "Detailed fact-check analysis..."
}
```

**Note:** If Google Search grounding is not available, the API falls back to knowledge-based analysis with a note in the response.

**Example:**
```javascript
const response = await fetch('/api/fact-check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'The Earth is flat'
  })
});
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `500 Internal Server Error` - Server or API error

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Rate Limits

Currently, there are no explicit rate limits, but be mindful of:
- Google Gemini API quotas
- Vercel serverless function execution limits

---

## Best Practices

1. **Always validate user input** before sending to the API
2. **Implement retry logic** for failed requests
3. **Show loading states** while waiting for AI responses (they can take 3-10 seconds)
4. **Handle errors gracefully** with user-friendly messages
5. **Cache responses** when appropriate to reduce API calls

---

## Testing

Use tools like Postman or curl to test the endpoints:

```bash
curl -X POST http://localhost:3000/api/study-buddy \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here"}'
```

---

## Authentication

Currently, there is no authentication required. For production use, consider implementing:
- API key authentication
- Rate limiting per user
- User session management

---

For more information, see the main [README.md](README.md) file.
