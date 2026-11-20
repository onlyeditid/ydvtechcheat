import {
  Badge,
  Card,
  Empty,
  Button,
  Markdown,
  Textarea,
} from "@/components";
import { DEFAULT_BUILTIN_FREE_SELECTION, getConversationById } from "@/lib";
import { useApp } from "@/contexts";
import { ChatConversation } from "@/types";
import {
  CameraIcon,
  Download,
  MessageCircleIcon,
  MessageCircleReplyIcon,
  Trash2,
  SparklesIcon,
  UserIcon,
  SendIcon,
  Check,
  Loader2,
  XIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import moment from "moment";
import { useParams, useNavigate } from "react-router-dom";
import { PageLayout } from "@/layouts";
import { useHistory, useChatCompletion } from "@/hooks";
import { MAX_FILES } from "@/config";
import { ModelSelector } from "@/pages/app/components/completion/ModelSelector";
import {
  DeleteConfirmationDialog,
  ChatAudio,
  ChatScreenshot,
  ChatFiles,
  AudioRecorder,
} from ".";

const View = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { selectedAIProvider, onSetSelectedAIProvider } = useApp();
  const [messages, setMessages] = useState<ChatConversation | null>(null);

  const {
    handleDeleteConfirm,
    confirmDelete,
    cancelDelete,
    deleteConfirm,
    handleAttachToOverlay,
    handleDownload,
    isDownloaded,
    isAttached,
  } = useHistory();

  const completion = useChatCompletion(
    conversationId as string,
    messages,
    setMessages
  );

  useEffect(() => {
    const getMessages = async () => {
      const conversation = await getConversationById(conversationId as string);
      setMessages(conversation || null);
    };
    getMessages();
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages load
    if (messages?.messages?.length) {
      setTimeout(() => {
        completion.messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    }
  }, [messages?.messages?.length]);

  const handleDelete = async () => {
    await confirmDelete();
    navigate(-1);
  };

  const messageCount = messages?.messages?.length ?? 0;

  return (
    <PageLayout
      isMainTitle={false}
      allowBackButton={true}
      title={messages?.title || "Conversation"}
      description={`${messageCount} messages in this conversation`}
      rightSlot={
        <div className="flex flex-row flex-wrap items-center gap-2">
          <ModelSelector compact={false} />
          <Button
            variant={completion.attachedFiles.length > 0 ? "default" : "outline"}
            title="Capture screenshot and attach to chat"
            aria-label="Capture screenshot"
            className="text-[10px] lg:text-xs h-7 lg:h-8 gap-1.5"
            onClick={completion.captureScreenshot}
            disabled={
              completion.isLoading ||
              completion.isScreenshotLoading ||
              completion.attachedFiles.length >= MAX_FILES
            }
          >
            {completion.isScreenshotLoading ? (
              <Loader2 className="size-3 lg:size-3.5 animate-spin" />
            ) : (
              <CameraIcon className="size-3 lg:size-3.5" />
            )}
            Screenshot
            {completion.attachedFiles.length > 0 && (
              <span className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
                {completion.attachedFiles.length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            title="Open this conversation in overlay"
            className="text-[10px] lg:text-sm h-7 lg:h-8"
            onClick={() =>
              conversationId && handleAttachToOverlay(conversationId)
            }
            disabled={isAttached}
          >
            {isAttached ? (
              <>
                <Check className="size-3 lg:size-4 text-green-600" />
                Attached
              </>
            ) : (
              <>
                Open in Overlay{" "}
                <MessageCircleReplyIcon className="size-3 lg:size-4" />
              </>
            )}
          </Button>
          <Button
            variant={"outline"}
            title="Download conversation as markdown"
            className="text-[10px] lg:text-sm h-7 lg:h-8"
            onClick={(e) => handleDownload(messages, e)}
            disabled={isDownloaded}
          >
            {isDownloaded ? (
              <>
                <Check className="size-3 lg:size-4 text-green-600" />
                Downloaded
              </>
            ) : (
              <>
                Download <Download className="size-3 lg:size-4" />
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            title="Delete conversation"
            onClick={() =>
              conversationId && handleDeleteConfirm(conversationId)
            }
            className="text-[10px] lg:text-sm h-7 lg:h-8"
          >
            Delete <Trash2 className="size-3 lg:size-4" />
          </Button>
        </div>
      }
    >
      {messageCount === 0 ? (
        <Empty
          isLoading={false}
          icon={MessageCircleIcon}
          title="No messages found"
          description="Start a new message or capture a screenshot to get started"
        />
      ) : (
        <div className="flex flex-col gap-4 pb-28 px-2">
          {messages?.messages.map((message, index, array) => {
            const isUser = message.role === "user";
            const showDate =
              index === 0 ||
              moment(message.timestamp).format("YYYY-MM-DD") !==
                moment(array[index - 1]?.timestamp).format("YYYY-MM-DD");

            return (
              <div key={message.id}>
                {/* Date separator */}
                {showDate && (
                  <Badge
                    variant={"outline"}
                    className="flex items-center justify-center my-4 w-fit mx-auto"
                  >
                    {moment(message.timestamp).format("ddd, MMM D")}
                  </Badge>
                )}

                {/* Message */}
                <div
                  className={`flex gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar - Left side for bot */}
                  {!isUser && (
                    <div className="flex-shrink-0">
                      <div className="size-7 lg:size-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <SparklesIcon className="size-3 lg:size-4 text-primary" />
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div
                    className={`flex flex-col gap-1 max-w-[70%] ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <Card
                      className={`p-3 text-xs lg:text-sm transition-all shadow-none ${
                        isUser
                          ? "!bg-primary text-primary-foreground !border-primary rounded-tr-sm"
                          : "!bg-muted/50 dark:!bg-muted/30 rounded-tl-sm"
                      }`}
                    >
                      <Markdown>{message.content}</Markdown>
                    </Card>
                    <Badge
                      variant="outline"
                      className={`text-[10px] lg:text-xs bg-transparent border-none ${
                        isUser ? "-mr-1" : "-ml-1"
                      }`}
                    >
                      {moment(message.timestamp).format("hh:mm A")}
                    </Badge>
                  </div>

                  {/* Avatar - Right side for user */}
                  {isUser && (
                    <div className="flex-shrink-0">
                      <div className="size-7 lg:size-8 rounded-full bg-primary flex items-center justify-center">
                        <UserIcon className="size-3 lg:size-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={completion.messagesEndRef} />
        </div>
      )}

      {/* Sticky Footer Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur border-t border-border/40">
        {completion.error && (
          <div className="px-4 pt-3 pb-0">
            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Error:</strong> {completion.error}
              </div>
              {selectedAIProvider.provider !== "gemini-free" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 text-foreground bg-background"
                  onClick={() => {
                    onSetSelectedAIProvider(DEFAULT_BUILTIN_FREE_SELECTION);
                    completion.setState((prev) => ({ ...prev, error: null }));
                  }}
                >
                  <SparklesIcon className="h-3.5 w-3.5 text-primary" />
                  Switch to Built-in Free Model (No Key Needed)
                </Button>
              )}
            </div>
          </div>
        )}

        {completion.attachedFiles.length > 0 && (
          <div className="px-4 pt-2 flex flex-wrap gap-2">
            {completion.attachedFiles.map((file) => (
              <div
                key={file.id}
                className="relative group flex items-center gap-2 rounded-lg border bg-muted/40 p-1.5 pr-7"
              >
                <img
                  src={`data:${file.type};base64,${file.base64}`}
                  alt={file.name}
                  className="h-9 w-12 object-cover rounded"
                />
                <span className="text-[11px] max-w-[140px] truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => completion.removeFile(file.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-background"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-start gap-2 p-4">
          <div className="flex-1 relative">
            {completion.isRecording ? (
              <AudioRecorder
                onTranscriptionComplete={(text) => {
                  completion.setIsRecording(false);
                  completion.submit(text);
                }}
                onCancel={() => completion.setIsRecording(false)}
              />
            ) : (
              <>
                <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                  <ChatFiles
                    attachedFiles={completion.attachedFiles}
                    handleFileSelect={completion.handleFileSelect}
                    removeFile={completion.removeFile}
                    onRemoveAllFiles={completion.onRemoveAllFiles}
                    isLoading={completion.isLoading}
                    isFilesPopoverOpen={completion.isFilesPopoverOpen}
                    setIsFilesPopoverOpen={completion.setIsFilesPopoverOpen}
                    disabled={false}
                  />
                  <ChatAudio
                    micOpen={completion.micOpen}
                    setMicOpen={completion.setMicOpen}
                    isRecording={completion.isRecording}
                    setIsRecording={completion.setIsRecording}
                    disabled={false}
                  />
                  <ChatScreenshot
                    screenshotConfiguration={completion.screenshotConfiguration}
                    attachedFiles={completion.attachedFiles}
                    isLoading={completion.isLoading}
                    captureScreenshot={completion.captureScreenshot}
                    isScreenshotLoading={completion.isScreenshotLoading}
                    disabled={false}
                  />
                </div>

                <Textarea
                  ref={completion.inputRef}
                  placeholder="Type a message..."
                  className="pr-12 pl-2 resize-none pb-12 pt-3"
                  rows={2}
                  value={completion.input}
                  onChange={(e) => completion.setInput(e.target.value)}
                  onKeyDown={completion.handleKeyPress}
                  onPaste={completion.handlePaste}
                  disabled={completion.isLoading}
                />
                <Button
                  size="icon"
                  className="size-7 lg:size-9 rounded-lg lg:rounded-xl absolute right-2 bottom-2"
                  title="Send message"
                  onClick={() => completion.submit()}
                  disabled={completion.isLoading || !completion.input.trim()}
                >
                  {completion.isLoading ? (
                    <Loader2 className="size-3 lg:size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-3 lg:size-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        deleteConfirm={deleteConfirm}
        cancelDelete={cancelDelete}
        confirmDelete={handleDelete}
      />
    </PageLayout>
  );
};

export default View;
