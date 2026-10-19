// ============================================================
// KNOWLEDGE BASE / RAG DOCUMENTS PAGE
// ============================================================
//
// Private document library with semantic search,
// Ask with AI, and document preview.
//

import {
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  askDocument,
  deleteDocument,
  getDocumentFile,
  listDocuments,
  searchDocument,
  summarizeDocument,
  uploadDocument,
} from "../../services/ragService.js";

import styles from "./RagDocuments.module.css";

// Quick prompts that fill the summary box; the user can still edit them.
const SUMMARY_PRESETS = [
  { label: "One page", prompt: "Summarize this document in one page." },
  {
    label: "Under 500 words",
    prompt: "Summarize this document in no more than 500 words.",
  },
  {
    label: "Bullet points",
    prompt: "Summarize the key points of this document as bullet points.",
  },
  {
    label: "Executive summary",
    prompt: "Write an executive summary of this document.",
  },
];

// Save text as a .txt or .md file, entirely in the browser.
const downloadTextFile = (content, documentTitle, extension = "txt") => {
  const baseName =
    (documentTitle || "document")
      .replace(/\.pdf$/i, "")
      .replace(/[^\w-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "document";
  const mimeType = extension === "md" ? "text/markdown" : "text/plain";
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");

  link.href = url;
  link.download = `${baseName}-summary.${extension}`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getSelectedPdf = (candidate) => {
  if (!candidate) return null;

  const isPdf =
    candidate.type === "application/pdf" || /\.pdf$/i.test(candidate.name);

  const isText =
    candidate.type === "text/plain" || /\.txt$/i.test(candidate.name);

  return isPdf || isText ? candidate : null;
};

const RagDocuments = () => {
  // A ref lets the visible "Choose file" button open the hidden native input.
  const fileInput = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeTab, setActiveTab] = useState("ask");
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [askQuery, setAskQuery] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [summaryPrompt, setSummaryPrompt] = useState("");
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState({ documentId: null, url: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [workingAction, setWorkingAction] = useState("");
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Resolve the selected document from fresh polling responses.
  const activeDocument = useMemo(
    () =>
      documents.find((document) => document.documentId === activeId) || null,
    [activeId, documents],
  );

  const activeDocumentId = activeDocument?.documentId;
  const activeDocumentStatus = activeDocument?.status;

  const hasProcessingDocuments = documents.some(
    (document) => document.status === "processing",
  );

  // Load the private library and select the newest document on first visit.
  const loadDocuments = useCallback(async ({ quiet = false } = {}) => {
    try {
      const nextDocuments = await listDocuments();

      setDocuments(nextDocuments);

      setActiveId((currentId) =>
        nextDocuments.some((document) => document.documentId === currentId)
          ? currentId
          : nextDocuments[0]?.documentId || null,
      );

      setError("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load your document library.",
      );
    } finally {
      if (!quiet) {
        setIsLoading(false);
      }
    }
  }, []);

  // Load the library when the page opens.
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Keep every in-progress upload current.
  useEffect(() => {
    if (!hasProcessingDocuments) return undefined;

    const timer = window.setInterval(
      () => loadDocuments({ quiet: true }),
      2500,
    );

    return () => window.clearInterval(timer);
  }, [hasProcessingDocuments, loadDocuments]);

  // The browser renders PDF and plain-text files in the document preview.
  useEffect(() => {
    let isCurrent = true;
    let objectUrl = "";

    if (
      !activeDocumentId ||
      activeDocumentStatus !== "ready" ||
      activeTab !== "preview" ||
      !["application/pdf", "text/plain"].includes(activeDocument?.mimeType)
    ) {
      return undefined;
    }

    getDocumentFile(activeDocumentId)
      .then((url) => {
        if (!isCurrent) {
          URL.revokeObjectURL(url);
          return;
        }

        objectUrl = url;

        setPreview({
          documentId: activeDocumentId,
          url,
        });
      })
      .catch(() => setError("Could not load the document preview."));

    return () => {
      isCurrent = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    activeDocumentId,
    activeDocumentStatus,
    activeTab,
    activeDocument?.mimeType,
  ]);

  // Toasts announce completed actions without interrupting the page.
  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(""), 3800);

    return () => window.clearTimeout(timer);
  }, [toast]);

  // Upload the selected document and immediately focus it in the workspace.
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const document = await uploadDocument(file);

      setDocuments((current) => [document, ...current]);
      setActiveId(document.documentId);
      setActiveTab("ask");

      setFile(null);
      setResults([]);
      setHasSearched(false);
      setAnswer(null);
      setSummary(null);
      setSummaryPrompt("");
      setSearchQuery("");
      setAskQuery("");

      setToast("Document uploaded. It will be ready after indexing finishes.");

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not upload this document.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelection = (selectedFile) => {
    const document = getSelectedPdf(selectedFile);

    if (selectedFile && !document) {
      setFile(null);
      setError("Please choose a PDF or TXT file.");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      return;
    }

    setFile(document);
    setError("");
  };

  const handleFileChange = (event) => {
    handleFileSelection(event.target.files?.[0] || null);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (isUploading) return;

    const droppedFile = event.dataTransfer.files?.[0] || null;
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  // Switching documents clears outputs that belong to the previous document.
  const handleSelect = (documentId) => {
    setActiveId(documentId);
    setActiveTab("ask");
    setSearchQuery("");
    setAskQuery("");
    setResults([]);
    setHasSearched(false);
    setAnswer(null);
    setSummary(null);
    setSummaryPrompt("");
    setError("");
  };

  // Run semantic retrieval independently from the grounded-answer form.
  const handleSemanticSearch = async (event) => {
    event.preventDefault();

    if (!activeDocument || !searchQuery.trim()) return;

    setWorkingAction("search");
    setError("");
    setHasSearched(true);
    setResults([]);

    try {
      const data = await searchDocument(
        activeDocument.documentId,
        searchQuery.trim(),
      );

      setResults(data.results || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not search this document right now.",
      );
    } finally {
      setWorkingAction("");
    }
  };

  // Ask the server for a document-grounded answer with passage citations.
  const handleAsk = async (event) => {
    event.preventDefault();

    if (!activeDocument || !askQuery.trim() || workingAction === "ask") {
      return;
    }

    setWorkingAction("ask");
    setError("");

    try {
      setAnswer(await askDocument(activeDocument.documentId, askQuery.trim()));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not answer from this document right now.",
      );
    } finally {
      setWorkingAction("");
    }
  };

  // Summarize the whole PDF following the user's instruction.
  const handleSummarize = async (event) => {
    event.preventDefault();
    if (!activeDocument || workingAction === "summarize") return;

    setWorkingAction("summarize");
    setError("");
    setSummary(null);

    try {
      setSummary(
        await summarizeDocument(
          activeDocument.documentId,
          summaryPrompt.trim(),
        ),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not summarize this document right now.",
      );
    } finally {
      setWorkingAction("");
    }
  };

  // Download the Ask AI answer as a text file.
  const handleDownloadAnswer = () => {
    if (!answer?.answer) return;

    downloadTextFile(answer.answer, activeDocument?.title, "txt");
    setToast("Answer downloaded.");
  };

  // Download the generated summary as .txt or .md.
  const handleDownloadSummary = (extension) => {
    if (!summary?.summary) return;

    downloadTextFile(summary.summary, activeDocument?.title, extension);
    setToast(`Summary downloaded as .${extension}.`);
  };

  // The custom confirmation panel replaces browser confirmation dialogs.
  const handleDelete = async () => {
    if (!pendingDeleteDoc) return;

    setWorkingAction("delete");
    setError("");

    try {
      await deleteDocument(pendingDeleteDoc.documentId);

      setDocuments((current) =>
        current.filter(
          (document) => document.documentId !== pendingDeleteDoc.documentId,
        ),
      );

      if (activeId === pendingDeleteDoc.documentId) {
        setActiveId(null);
        setResults([]);
        setAnswer(null);
        setSummary(null);
        setPreview({ documentId: null, url: "" });
      }

      setPendingDeleteDoc(null);
      setToast("Document deleted from your private library.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not delete this document.",
      );
    } finally {
      setWorkingAction("");
    }
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <span>Knowledge base</span>

        <h1>Private document library</h1>

        <p>
          Upload study or reference PDFs or TXT files to your own workspace.
          Each file is indexed for semantic search, and optional AI answers use
          passages from that document only. File size limits apply on the
          server; other users never see your uploads.
        </p>
      </header>

      {toast && (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={17} />

          {toast}

          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
            type="button"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.workspace}>
        <aside className={styles.library} aria-label="Private document library">
          <header className={styles.libraryHeader}>
            <h2>Library</h2>

            <p>
              Add PDF or TXT documents to your library. Files are processed
              automatically after upload. Maximum file size: 10 MB.
            </p>
          </header>

          <div
            aria-label="Drop a PDF or TXT file here, or choose a file"
            className={`${styles.uploadBox} ${
              isDragging ? styles.uploadBoxDragging : ""
            }`}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="region"
          >
            <p className={styles.dropHint}>
              Drag and drop a PDF or TXT file here, or choose one below.
            </p>

            <input
              accept=".pdf,.txt"
              disabled={isUploading}
              onChange={handleFileChange}
              ref={fileInput}
              type="file"
            />

            <div className={styles.uploadActions}>
              <button
                className={styles.fileButton}
                disabled={isUploading}
                onClick={() => fileInput.current?.click()}
                type="button"
              >
                <FileText size={16} />
                Choose file
              </button>

              <button
                className={styles.uploadButton}
                disabled={!file || isUploading}
                onClick={handleUpload}
                type="button"
              >
                {isUploading ? (
                  <LoaderCircle className={styles.spin} size={16} />
                ) : (
                  <Upload size={16} />
                )}

                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            <small>{file?.name || "No file selected"}</small>
          </div>

          {isLoading && <p className={styles.muted}>Loading your library...</p>}

          {!isLoading && !documents.length && (
            <p className={styles.muted}>
              Upload a PDF or TXT document to make it available for private
              search and AI answers.
            </p>
          )}

          <div className={styles.documentList}>
            {documents.map((document) => (
              <div
                aria-current={
                  activeId === document.documentId ? "true" : undefined
                }
                className={`${styles.documentCard} ${
                  activeId === document.documentId
                    ? styles.documentCardActive
                    : ""
                }`}
                key={document.documentId}
                onClick={() => handleSelect(document.documentId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(document.documentId);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className={styles.documentMeta}>
                  <b className={styles.documentTitle} title={document.title}>
                    {document.title}
                  </b>

                  <div className={styles.badgeWrapper}>
                    <span className={styles[`status${document.status}`]}>
                      {document.status}
                    </span>
                  </div>
                </div>

                <button
                  aria-label={`Delete ${document.title}`}
                  className={styles.deleteButton}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteDoc(document);
                  }}
                  title="Delete document"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.reader}>
          {!activeDocument && !isLoading && (
            <div className={styles.emptyReader}>
              Choose an uploaded document to open it here. Semantic search and
              Ask with AI will use only the selected document.
            </div>
          )}

          {activeDocument && (
            <>
              <div className={styles.readerTitle}>
                <div>
                  <h2>{activeDocument.title}</h2>

                  <p>
                    Private document reader, semantic search, and
                    source-grounded answers.
                  </p>
                </div>
              </div>

              {activeDocument.status === "processing" && (
                <div className={styles.pending}>
                  <LoaderCircle className={styles.spin} size={20} />
                  Processing this document. The reader will become available
                  automatically.
                </div>
              )}

              {activeDocument.status === "failed" && (
                <div className={styles.failed}>
                  {activeDocument.errorMessage ||
                    "This document could not be processed."}
                </div>
              )}

              {activeDocument.status === "ready" && (
                <>
                  <div
                    aria-label="Document tools"
                    className={styles.tabs}
                    role="tablist"
                  >
                    <button
                      aria-controls="ask-ai-panel"
                      aria-selected={activeTab === "ask"}
                      className={activeTab === "ask" ? styles.activeTab : ""}
                      onClick={() => setActiveTab("ask")}
                      role="tab"
                      type="button"
                    >
                      Ask AI
                    </button>

                    <button
                      aria-controls="semantic-search-panel"
                      aria-selected={activeTab === "search"}
                      className={activeTab === "search" ? styles.activeTab : ""}
                      onClick={() => setActiveTab("search")}
                      role="tab"
                      type="button"
                    >
                      Semantic Search
                    </button>
                    <button
                      aria-controls="summarize-panel"
                      aria-selected={activeTab === "summarize"}
                      className={
                        activeTab === "summarize" ? styles.activeTab : ""
                      }
                      onClick={() => setActiveTab("summarize")}
                      role="tab"
                      type="button"
                    >
                      Summarize
                    </button>
                    <button
                      aria-controls="document-preview-panel"
                      aria-selected={activeTab === "preview"}
                      className={
                        activeTab === "preview" ? styles.activeTab : ""
                      }
                      onClick={() => setActiveTab("preview")}
                      role="tab"
                      type="button"
                    >
                      Preview
                    </button>
                  </div>

                  {activeTab === "preview" && (
                    <section id="document-preview-panel" role="tabpanel">
                      {preview.documentId === activeDocument.documentId &&
                      preview.url ? (
                        <iframe
                          className={styles.preview}
                          src={preview.url}
                          title={`Preview of ${activeDocument.title}`}
                        />
                      ) : (
                        <div className={styles.pending}>
                          <LoaderCircle className={styles.spin} size={20} />
                          Loading document preview...
                        </div>
                      )}
                    </section>
                  )}

                  {activeTab === "search" && (
                    <section
                      className={styles.toolSection}
                      id="semantic-search-panel"
                      role="tabpanel"
                    >
                      <h2>Semantic search</h2>

                      <p>Finds passages by meaning, not only exact keywords.</p>

                      <form onSubmit={handleSemanticSearch}>
                        <label htmlFor="semantic-query">Search query</label>

                        <input
                          id="semantic-query"
                          onChange={(event) =>
                            setSearchQuery(event.target.value)
                          }
                          placeholder="How does a function work?"
                          value={searchQuery}
                        />

                        <button
                          disabled={
                            workingAction === "search" || !searchQuery.trim()
                          }
                          type="submit"
                        >
                          {workingAction === "search" ? (
                            <LoaderCircle className={styles.spin} size={16} />
                          ) : (
                            <Search size={16} />
                          )}

                          {workingAction === "search"
                            ? "Searching..."
                            : "Search"}
                        </button>
                      </form>

                      <div className={styles.searchResults} aria-live="polite">
                        {results.map((result) => (
                          <article key={result.chunkId}>
                            <b>
                              Chunk {result.chunkIndex + 1} - relevance{" "}
                              {result.score.toFixed(3)}
                            </b>

                            <p>{result.excerpt}</p>
                          </article>
                        ))}

                        {hasSearched && !results.length && (
                          <p className={styles.noResults}>
                            No relevant passages were found in this document.
                            Try a more specific question or a phrase used in the
                            document.
                          </p>
                        )}
                      </div>
                    </section>
                  )}

                  {activeTab === "summarize" && (
                    <section
                      className={styles.toolSection}
                      id="summarize-panel"
                      role="tabpanel"
                    >
                      <h2>Summarize PDF</h2>
                      <p>
                        Tell the AI how to summarize the whole document, for
                        example its length or format, then download the result.
                      </p>

                      <div className={styles.presetRow}>
                        {SUMMARY_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setSummaryPrompt(preset.prompt)}
                            type="button"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <form onSubmit={handleSummarize}>
                        <label htmlFor="summary-prompt">Instructions</label>
                        <textarea
                          id="summary-prompt"
                          maxLength={2000}
                          onChange={(event) =>
                            setSummaryPrompt(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              if (workingAction !== "summarize") {
                                event.currentTarget.form?.requestSubmit();
                              }
                            }
                          }}
                          placeholder="e.g. Summarize this in one page, or in no more than 500 words, or as bullet points"
                          value={summaryPrompt}
                        />
                        <button
                          disabled={workingAction === "summarize"}
                          type="submit"
                        >
                          {workingAction === "summarize" ? (
                            <LoaderCircle className={styles.spin} size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          {workingAction === "summarize"
                            ? "Summarizing..."
                            : "Summarize"}
                        </button>
                      </form>

                      {summary && (
                        <div
                          className={styles.summaryResult}
                          aria-live="polite"
                        >
                          <div className={styles.summaryHeader}>
                            <b>Summary &middot; {summary.wordCount} words</b>
                            <div className={styles.summaryActions}>
                              <button
                                className={styles.downloadButton}
                                onClick={() => handleDownloadSummary("txt")}
                                type="button"
                              >
                                <Download size={14} />
                                Download .txt
                              </button>
                              <button
                                className={styles.downloadButton}
                                onClick={() => handleDownloadSummary("md")}
                                type="button"
                              >
                                <Download size={14} />
                                Download .md
                              </button>
                            </div>
                          </div>
                          {summary.truncated && (
                            <p className={styles.summaryNote}>
                              This PDF is very long, so only the first part of
                              it was summarized.
                            </p>
                          )}
                          <div className={styles.summaryBody}>
                            <ReactMarkdown>{summary.summary}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {activeTab === "ask" && (
                    <section
                      className={styles.toolSection}
                      id="ask-ai-panel"
                      role="tabpanel"
                    >
                      <h2>Ask with AI</h2>

                      <p>
                        Answers only use retrieved excerpts from this document
                        and include source references when evidence exists.
                      </p>

                      <form onSubmit={handleAsk}>
                        <label htmlFor="ask-query">Question</label>

                        <textarea
                          id="ask-query"
                          onChange={(event) => setAskQuery(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();

                              if (askQuery.trim() && workingAction !== "ask") {
                                event.currentTarget.form?.requestSubmit();
                              }
                            }
                          }}
                          placeholder="Ask a clear question about this document"
                          value={askQuery}
                        />

                        <button
                          disabled={workingAction === "ask" || !askQuery.trim()}
                          type="submit"
                        >
                          {workingAction === "ask" ? (
                            <LoaderCircle className={styles.spin} size={16} />
                          ) : (
                            <Sparkles size={16} />
                          )}

                          {workingAction === "ask" ? "Asking..." : "Ask"}
                        </button>
                      </form>

                      {answer && (
                        <div className={styles.answer} aria-live="polite">
                          <p>{answer.answer}</p>
                          {answer.isGrounded && (
                            <button
                              aria-label="Download this answer as a text file"
                              className={styles.downloadButton}
                              onClick={handleDownloadAnswer}
                              type="button"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          )}
                          {answer.citations?.length > 0 && (
                            <footer className={styles.sourceReferences}>
                              <span>Source references:</span>

                              <div>
                                {answer.citations.map((citation) => (
                                  <span
                                    aria-label={`Reference ${citation.ref}, chunk ${
                                      citation.chunkIndex + 1
                                    }`}
                                    key={citation.ref}
                                  >
                                    [{citation.ref}] &rarr; chunk{" "}
                                    {citation.chunkIndex + 1}
                                  </span>
                                ))}
                              </div>
                            </footer>
                          )}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>

      {pendingDeleteDoc && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-describedby="delete-document-copy"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <h2>Delete this document?</h2>

            <p id="delete-document-copy">
              “{pendingDeleteDoc.title}” and its private search index will be
              permanently removed.
            </p>

            <div>
              <button
                disabled={workingAction === "delete"}
                onClick={() => setPendingDeleteDoc(null)}
                type="button"
              >
                Cancel
              </button>

              <button
                disabled={workingAction === "delete"}
                onClick={handleDelete}
                type="button"
              >
                {workingAction === "delete" ? "Deleting..." : "Delete document"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default RagDocuments;
