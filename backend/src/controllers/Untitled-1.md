Viewed documentController.js:1-60
Viewed documentController.js:115-235
Viewed documentController.js:224-255

Here is the complete, verified breakdown of **Yohannes Abegaz (“John”)’s** specific tasks, files, and code for **Milestone 3 (Knowledge Base / RAG)**.

---

# 1. Summary of John’s Tasks

* **Owner:** Yohannes Abegaz (John)
* **Milestone:** Week 3 — Knowledge Base / RAG
* **Official Tasks:**
  1. **`T-24 — Get RAG Document Metadata`**
  2. **`T-24 — Stream RAG Document PDF`**
* **Area:** Backend / Documents / File Streaming / Authentication / Integration
* **Branch:** `feature/T-24-rag-document-meta-file`
* **Commit Message:** `Implement RAG document metadata and PDF streaming`
* **APIs Built:**
  * `GET /api/rag/documents/:documentId` (Document metadata)
  * `GET /api/rag/documents/:documentId/file` (Binary PDF streaming)
* **Objective:** Enable authenticated users to fetch single-document details and stream the raw PDF file directly into the browser (which feeds Tsega's frontend PDF preview iframe).

---

# 2. Files and Exact Code Owned by John

John owns the backend pipeline across **3 core files**:

```
1. backend/src/routes/documentRoutes.js ──► Route definitions
2. backend/src/controllers/documentController.js ──► Validation, getDocument & streamDocument
3. backend/src/models/Document.js ──► findByIdForUser with ownership filtering
```

---

## File 1: `backend/src/routes/documentRoutes.js`

### What he owns:
```javascript
5:   getDocument,
...
9:   streamDocument,
...
25: router.get("/:documentId/file", streamDocument);
27: router.get("/:documentId", getDocument);
```

### Explanation:
* **Line 27 (`GET /:documentId`):** Routes requests for document metadata to the `getDocument` controller.
* **Line 25 (`GET /:documentId/file`):** Routes requests for the raw PDF binary stream to the `streamDocument` controller.
* Both routes are protected by the JWT `authenticate` middleware on Line 18.

---

## File 2: `backend/src/controllers/documentController.js`

John owns two critical security helpers and two controller endpoints in this file:

### A. Ownership & Validation Security Helpers (Lines 11–37)
```javascript
11: const getDocumentId = (rawDocumentId) => {
12:   const documentId = Number(rawDocumentId);
13: 
14:   if (!Number.isSafeInteger(documentId) || documentId < 1) {
15:     const error = new Error("Document identifier must be a positive integer.");
16:     error.statusCode = 400;
17:     throw error;
18:   }
19: 
20:   return documentId;
21: };
22: 
23: const findOwnedDocument = async (rawDocumentId, userId, options = {}) => {
24:   const document = await Document.findByIdForUser(
25:     getDocumentId(rawDocumentId),
26:     userId,
27:     options,
28:   );
29: 
30:   if (!document) {
31:     const error = new Error("Document not found.");
32:     error.statusCode = 404;
33:     throw error;
34:   }
35: 
36:   return document;
37: };
```
* **Lines 11–21 (`getDocumentId`):** Validates that `:documentId` is a safe, positive integer. If a user passes strings or negative numbers (e.g., `/documents/abc`), it immediately throws a `400 Bad Request`.
* **Lines 23–37 (`findOwnedDocument`):** **The core security guardrail.** It checks both the `documentId` AND `userId`. If the document belongs to another user or doesn't exist, it throws a generic **`404 Document not found`**. Returning 404 instead of 403 prevents attackers from guessing valid document IDs belonging to other users (avoids ID enumeration).

---

### B. Endpoint 1: Get Metadata (Lines 118–133)
```javascript
118: const getDocument = async (req, res, next) => {
119:   try {
120:     const document = await findOwnedDocument(
121:       req.params.documentId,
122:       req.user.userId,
123:     );
124: 
125:     return res.status(200).json({
126:       success: true,
127:       message: "Document fetched successfully.",
128:       data: document,
129:     });
130:   } catch (error) {
131:     return next(error);
132:   }
133: };
```
* **Lines 120–123:** Verifies ownership using `findOwnedDocument`.
* **Lines 125–129:** Returns the document metadata (`documentId`, `title`, `mimeType`, `byteSize`, `status`, `createdAt`, `updatedAt`) wrapped in the standard success envelope.

---

### C. Endpoint 2: PDF File Streaming (Lines 224–254)
```javascript
224: const streamDocument = async (req, res, next) => {
225:   try {
226:     const document = await findOwnedDocument(
227:       req.params.documentId,
228:       req.user.userId,
229:       { includeStoragePath: true },
230:     );
231: 
232:     try {
233:       await fs.access(document.storagePath);
234:     } catch (error) {
235:       if (error.code === "ENOENT") {
236:         const notFoundError = new Error(
237:           "The uploaded document file is no longer available.",
238:         );
239:         notFoundError.statusCode = 404;
240:         throw notFoundError;
241:       }
242:       throw error;
243:     }
244: 
245:     res.type(document.mimeType);
246:     return res.sendFile(document.storagePath, (error) => {
247:       if (!error) return;
248:       if (!res.headersSent) return next(error);
249:       return res.destroy(error);
250:     });
251:   } catch (error) {
252:     return next(error);
253:   }
254: };
```
* **Line 229 (`{ includeStoragePath: true }`):** Only requests the private filesystem path (`storagePath`) when streaming is needed.
* **Lines 232–243 (`fs.access` check):** Verifies that the physical file actually exists on the server disk. If the file was deleted or corrupted (`ENOENT`), it throws a clean `404 Not Found` rather than crashing the server.
* **Line 245 (`res.type(document.mimeType)`):** Sets `Content-Type: application/pdf` so the browser knows to render it natively.
* **Lines 246–250 (`res.sendFile` with error callback):** Streams the binary file chunk-by-chunk to the HTTP response. If the client disconnects mid-stream, `res.destroy(error)` safely terminates the stream without leaking memory or sockets.

---

## File 3: `backend/src/models/Document.js`

### What he owns:
```javascript
50:   async findByIdForUser(documentId, userId, options = {}) {
51:     const [rows] = await pool.execute(
52:       `SELECT document_id, title, mime_type, storage_path, byte_size, status,
53:               error_message, created_at, updated_at
54:        FROM documents
55:        WHERE document_id = ? AND user_id = ?
56:        LIMIT 1`,
57:       [documentId, userId],
58:     );
59: 
60:     return rows[0] ? mapDocument(rows[0], options) : null;
61:   },
```
* **Line 55 (`WHERE document_id = ? AND user_id = ?`):** Dual parameterized SQL filter enforcing that the document must match **both** the requested ID and the user's ID.
* **Line 60 (`mapDocument(rows[0], options)`):** Converts the database row into camelCase. If `options.includeStoragePath` is `true`, it attaches `storagePath` for file streaming.

---

# 3. How John's Part Connects with the Team

* **Feeds Tsega's PDF Preview Tab:** When Tsega’s frontend calls `ragService.getDocumentFile(id)`, it hits John's `GET /api/rag/documents/:id/file` endpoint to retrieve the PDF binary blob.
* **Shares `findOwnedDocument` with Dawit's Search & Ask endpoints:** The helper John wrote (`findOwnedDocument`) is used across the entire controller to protect search, query, and delete actions.

---

# 4. Quick 30-Second Speaking Pitch for John

> *"Hello, I’m Yohannes Abegaz. For Milestone 3, I was responsible for task **T-24: Document Metadata and PDF Streaming**.*
>
> *I built two core endpoints in the backend:*
> 1. *`GET /api/rag/documents/:documentId` for retrieving document metadata.*
> 2. *`GET /api/rag/documents/:documentId/file` for streaming the raw PDF.*
>
> *Here is how I implemented them:*
> * *In `Document.js` (line 50), I wrote `findByIdForUser`, enforcing dual parameterized filtering with `WHERE document_id = ? AND user_id = ?` to guarantee strict ownership.*
> * *In `documentController.js`, I created `findOwnedDocument` to validate positive integer IDs and return a safe 404 to prevent document enumeration attacks.*
> * *In `streamDocument` (line 224), I verify physical disk access with `fs.access`, set the `application/pdf` MIME type, and use `res.sendFile` to stream the PDF directly to the browser for Tsega's preview tab, with proper client-disconnect error handling.*
>
> *Both endpoints are fully authenticated and tested against missing files and unauthorized access."*