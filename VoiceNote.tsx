import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Download, X, Volume2, Plus, Clock, Trash2 } from 'lucide-react';
import { Note } from '../types/Note';
import './VoiceNote.css';

interface VoiceRecording {
  id: string;
  audioUrl: string;
  transcript: string;
  duration: number;
  createdAt: string;
  title?: string;
}

interface VoiceNoteProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

const VoiceNote: React.FC<VoiceNoteProps> = ({
  note,
  onUpdate,
  onDelete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  const recordings = note.voiceRecordings || [];

  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      

      recognition.onresult = (event: any) => {
        let newFinalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update final transcript accumulator
        if (newFinalTranscript) {
          finalTranscriptRef.current += newFinalTranscript;
          setFinalTranscript(finalTranscriptRef.current);
        }
        
        // Show current progress (final + interim)
        const currentText = finalTranscriptRef.current + interimTranscript;
        if (currentText.trim()) {
          setCurrentTranscript(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (error) {
      console.warn('Speech recognition not available:', error);
    }
  };

  const stopSpeechRecognition = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use the most compressed format available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
        ? 'audio/mp4' 
        : 'audio/wav';
        
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setCurrentTranscript('');
      setFinalTranscript('');
      finalTranscriptRef.current = '';

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        
        // Convert audio blob to base64 for persistence
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          
          // Check if the base64 data is too large (warn if over 1MB)
          const sizeInMB = (base64Audio.length * 0.75) / (1024 * 1024); // Approximate size
          if (sizeInMB > 1) {
            console.warn(`Voice recording is large (${sizeInMB.toFixed(1)}MB). May cause storage issues.`);
            setSaveWarning(`Large recording (${sizeInMB.toFixed(1)}MB) may not save locally. Consider signing in for cloud storage.`);
            setTimeout(() => setSaveWarning(null), 8000); // Clear warning after 8 seconds
          }
          
          // Wait a bit for final speech recognition results
          setTimeout(() => {
            const savedTranscript = finalTranscriptRef.current || currentTranscript;
            
            // Create new recording with base64 audio for persistence
            const newRecording: VoiceRecording = {
              id: Date.now().toString(),
              audioUrl: base64Audio, // Use base64 instead of blob URL
              transcript: savedTranscript,
              duration: recordingTime,
              createdAt: new Date().toISOString(),
              title: savedTranscript.slice(0, 50) || `Recording ${recordings.length + 1}`
            };

            // Add to recordings array
            const updatedRecordings = [newRecording, ...recordings];
            
            try {
              onUpdate(note.id, { voiceRecordings: updatedRecordings });
              console.log('Voice recording saved successfully');
              setSaveWarning(null); // Clear any previous warnings
            } catch (error) {
              console.error('Failed to save voice recording:', error);
              setSaveWarning('Failed to save voice recording. Storage may be full.');
              setTimeout(() => setSaveWarning(null), 5000); // Clear warning after 5 seconds
            }
            
            // Don't reset transcript states here - keep them visible until next recording
          }, 500); // Wait 500ms for any final speech recognition results
        };
        
        reader.readAsDataURL(audioBlob);

        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        startSpeechRecognition();
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Stop speech recognition
      stopSpeechRecognition();
    }
  };

  const playRecording = (recording: VoiceRecording) => {
    // Stop any currently playing audio
    Object.values(audioRefs.current).forEach(audio => audio.pause());
    
    if (playingRecordingId === recording.id) {
      setPlayingRecordingId(null);
      return;
    }

    try {
      const audio = new Audio(recording.audioUrl);
      audioRefs.current[recording.id] = audio;

      audio.onended = () => setPlayingRecordingId(null);
      audio.onerror = () => {
        console.warn('Error playing audio:', recording.audioUrl);
        setPlayingRecordingId(null);
      };
      
      audio.play().catch(error => {
        console.warn('Failed to play audio:', error);
        setPlayingRecordingId(null);
      });
      
      setPlayingRecordingId(recording.id);
    } catch (error) {
      console.warn('Error creating audio element:', error);
      setPlayingRecordingId(null);
    }
  };

  const downloadRecording = (recording: VoiceRecording) => {
    const link = document.createElement('a');
    link.href = recording.audioUrl;
    link.download = `${recording.title || 'voice-recording'}.wav`;
    
    // For base64 URLs, we need to add the link to DOM briefly
    if (recording.audioUrl.startsWith('data:')) {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      link.click();
    }
  };

  const deleteRecording = (recordingId: string) => {
    const updatedRecordings = recordings.filter(r => r.id !== recordingId);
    onUpdate(note.id, { voiceRecordings: updatedRecordings });
    
    // Clean up audio reference
    if (audioRefs.current[recordingId]) {
      audioRefs.current[recordingId].pause();
      delete audioRefs.current[recordingId];
    }
    
    if (playingRecordingId === recordingId) {
      setPlayingRecordingId(null);
    }
  };

  const updateRecordingTranscript = (recordingId: string, newTranscript: string) => {
    const updatedRecordings = recordings.map(r => 
      r.id === recordingId 
        ? { ...r, transcript: newTranscript, title: newTranscript.slice(0, 50) || r.title }
        : r
    );
    onUpdate(note.id, { voiceRecordings: updatedRecordings });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="voice-note-container">
      <div className="voice-note-header">
        <div className="voice-title">
          <Volume2 size={16} />
          <span>Voice Recordings</span>
          <span className="recording-count">({recordings.length})</span>
        </div>

        <button
          className="note-delete-btn"
          onClick={() => onDelete(note.id)}
          title="Delete voice note"
        >
          <X size={14} />
        </button>
      </div>

      {/* Save Warning */}
      {saveWarning && (
        <div className="save-warning">
          ⚠️ {saveWarning}
        </div>
      )}

      {/* New Recording Card */}
      <div className="new-recording-card">
        <div className="new-recording-header">
          <Plus size={16} />
          <span>New Recording</span>
        </div>
        
        <div className="recording-controls">
          {!isRecording ? (
            <button
              className="record-btn"
              onClick={startRecording}
              title="Start recording"
            >
              <Mic size={20} />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              className="record-btn recording"
              onClick={stopRecording}
              title="Stop recording"
            >
              <Square size={20} />
              <span>Stop ({formatTime(recordingTime)})</span>
            </button>
          )}
        </div>

        {currentTranscript && (
          <div className="live-transcript">
            <span className="transcript-label">{isRecording ? 'Live Transcript:' : 'Last Transcript:'}</span>
            <p className="transcript-text">{currentTranscript}</p>
          </div>
        )}
      </div>

      {/* Recordings Inbox */}
      <div className="recordings-inbox">
        {recordings.length === 0 ? (
          <div className="empty-inbox">
            <Volume2 size={32} />
            <p>No recordings yet</p>
            <span>Start your first recording above</span>
          </div>
        ) : (
          <div className="recordings-list">
            {recordings.map((recording) => (
              <div key={recording.id} className="recording-card">
                <div className="recording-card-header">
                  <div className="recording-info">
                    <h4 className="recording-title">{recording.title}</h4>
                    <div className="recording-meta">
                      <Clock size={12} />
                      <span>{formatTime(recording.duration)}</span>
                      <span>•</span>
                      <span>{formatDate(recording.createdAt)}</span>
                    </div>
                  </div>
                  
                  <div className="recording-actions">
                    <button
                      className="play-btn"
                      onClick={() => playRecording(recording)}
                      title={playingRecordingId === recording.id ? "Pause" : "Play"}
                    >
                      {playingRecordingId === recording.id ? 
                        <Pause size={16} /> : <Play size={16} />
                      }
                    </button>
                    
                    <button
                      className="download-btn"
                      onClick={() => downloadRecording(recording)}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    
                    <button
                      className="delete-recording-btn"
                      onClick={() => deleteRecording(recording.id)}
                      title="Delete recording"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="recording-transcript">
                  <span className="transcript-label">Transcript:</span>
                  <textarea
                    className="transcript-input"
                    value={recording.transcript || ''}
                    onChange={(e) => updateRecordingTranscript(recording.id, e.target.value)}
                    placeholder="Add transcript manually or use speech recognition while recording..."
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceNote;