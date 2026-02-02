import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { EventDetails, FileType } from './types';
import { extractEventsFromFiles, extractEventsFromText, extractEventsFromUrl } from './services/openaiService';
import { generateIcsContent, downloadIcsFile } from './services/icsService';

// --- Assets ---
const addEventLogoUrl = "https://25141523.fs1.hubspotusercontent-eu1.net/hubfs/25141523/AddEvent%20Branding/AddEvent%20Full%20Logo.png";

// --- Helper & UI Components ---

type InputMethod = 'upload' | 'paste' | 'camera' | 'url';


// Converts ISO or Raw string to American Format: 01/27/2026, 9:00 AM
const formatDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    if (dateStr.includes('/') && dateStr.includes(':')) return dateStr;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr || '';

    return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};


const Header: React.FC = () => (
    <header className="text-center p-4 md:p-6">
      <img src={addEventLogoUrl} alt="AddEvent Logo" className="h-10 sm:h-12 mx-auto mb-4" />
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">
        Event Extractor & ICS Generator
      </h1>
      <p className="mt-2 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Turn any event flyer, calendar image, or URL into a universal calendar file.
      </p>
    </header>
  );

interface InputMethodSelectorProps {
  currentMethod: InputMethod;
  onMethodChange: (method: InputMethod) => void;
}

const InputMethodSelector: React.FC<InputMethodSelectorProps> = ({ currentMethod, onMethodChange }) => (
    <div className="flex justify-center items-center flex-wrap gap-2 sm:gap-4 p-2">
       <button
          onClick={() => onMethodChange('upload')}
          className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold rounded-full transition-all duration-300 flex items-center gap-2 shadow-sm ${
            currentMethod === 'upload' ? 'bg-[#e7f0ff] text-[#125EF8] ring-2 ring-[#125EF8]' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
       >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          Upload Files
       </button>
       <button
          onClick={() => onMethodChange('paste')}
          className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold rounded-full transition-all duration-300 flex items-center gap-2 shadow-sm ${
            currentMethod === 'paste' ? 'bg-[#e7f0ff] text-[#125EF8] ring-2 ring-[#125EF8]' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
       >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
          Paste Text
       </button>
        <button
          onClick={() => onMethodChange('url')}
          className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold rounded-full transition-all duration-300 flex items-center gap-2 shadow-sm ${
            currentMethod === 'url' ? 'bg-[#e7f0ff] text-[#125EF8] ring-2 ring-[#125EF8]' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
       >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
          Paste URL
       </button>
       <button
          onClick={() => onMethodChange('camera')}
          className={`px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold rounded-full transition-all duration-300 flex items-center gap-2 shadow-sm ${
            currentMethod === 'camera' ? 'bg-[#e7f0ff] text-[#125EF8] ring-2 ring-[#125EF8]' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
          Use Camera
        </button>
    </div>
  );


interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  // OpenAI does not support PDF uploads in this configuration
  const acceptedTypes = "image/png, image/jpeg, image/webp, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      // Convert FileList to Array
      const fileArray = Array.from(files);
      onFileUpload(fileArray);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  return (
    <div className="w-full max-w-xl mx-auto text-center">
        <label
            htmlFor="dropzone-file"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragActive ? 'border-[#125EF8] bg-blue-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
        >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-10 h-10 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                   Images, CSV, XLSX
                </p>
            </div>
            {/* Added multiple attribute */}
            <input id="dropzone-file" type="file" multiple className="hidden" onChange={handleChange} accept={acceptedTypes} />
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
             Upload multiple files if needed (e.g. multi-page flyers, several screenshots).
        </p>
    </div>
  );
};

interface TextInputProps {
  onTextSubmit: (text: string) => void;
}

const TextInput: React.FC<TextInputProps> = ({ onTextSubmit }) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        onTextSubmit(text);
    };

    const placeholderText = `Past event details here... For example:
- Team meeting tomorrow at 10 am in the conference room to discuss Q4
- For all of the games for our team, start them with "Team Name vs" or "Team Name @" for the following games...`;

    return (
        <div className="w-full max-w-xl mx-auto text-center">
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholderText}
                className="w-full h-64 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-[#125EF8] focus:border-transparent dark:bg-gray-700 dark:text-white transition"
            />
            <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="mt-4 bg-[#125EF8] hover:bg-[#0f4abf] text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg disabled:bg-gray-400 disabled:scale-100 disabled:cursor-not-allowed"
            >
                Analyze Text
            </button>
        </div>
    );
};

interface UrlInputProps {
  onUrlSubmit: (url: string) => void;
}

const UrlInput: React.FC<UrlInputProps> = ({ onUrlSubmit }) => {
    const [url, setUrl] = useState('');

    const handleSubmit = () => {
        onUrlSubmit(url);
    };

    return (
        <div className="w-full max-w-xl mx-auto text-center">
            <div className="relative">
                 <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/events/upcoming-meetup"
                    className="w-full h-48 text-center p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#125EF8] focus:border-transparent dark:bg-gray-700 dark:text-white transition"
                    aria-label="Event URL"
                />
            </div>
            <button
                onClick={handleSubmit}
                disabled={!url.trim()}
                className="mt-4 bg-[#125EF8] hover:bg-[#0f4abf] text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg disabled:bg-gray-400 disabled:scale-100 disabled:cursor-not-allowed"
            >
                Analyze URL
            </button>
        </div>
    );
};

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onCancel: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initCamera = async () => {
            if (capturedImage) return;

            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                
                if (!isMounted) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                if (!isMounted) return;
                console.error("Error accessing camera:", err);
                setError("Could not access the camera. Please ensure you have granted permission.");
            }
        };

        initCamera();

        return () => {
            isMounted = false;
            setIsStreaming(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [capturedImage]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(dataUrl);
            setIsStreaming(false);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setError(null);
        setIsStreaming(false);
    };

    const handleUsePhoto = () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob(blob => {
                if (blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    onCapture(file);
                }
            }, 'image/jpeg');
        }
    };

    if (error) {
        return (
            <div className="w-full max-w-xl mx-auto text-center p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg">
                <p className="font-bold">Camera Error</p>
                <p>{error}</p>
                <button onClick={onCancel} className="mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-full">
                    Go Back
                </button>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-xl mx-auto text-center">
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
                {capturedImage ? (
                    <img src={capturedImage} alt="Captured event" className="w-full h-full object-contain" />
                ) : (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        onCanPlay={() => setIsStreaming(true)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} 
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex justify-center space-x-4">
                {capturedImage ? (
                    <>
                        <button onClick={handleRetake} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg">Retake</button>
                        <button onClick={handleUsePhoto} className="bg-[#125EF8] hover:bg-[#0f4abf] text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg">Use Photo</button>
                    </>
                ) : (
                    <>
                        <button onClick={onCancel} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg">Cancel</button>
                        <button onClick={handleCapture} className="bg-[#125EF8] hover:bg-[#0f4abf] text-white font-bold py-3 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg">Capture</button>
                    </>
                )}
            </div>
        </div>
    );
};


const Loader: React.FC = () => (
    <div className="flex flex-col items-center justify-center space-y-4 my-8">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#125EF8]"></div>
      <p className="text-gray-600 dark:text-gray-300">Analyzing... this might take a moment.</p>
    </div>
);



// --- NEW RECURRING RULE EDITOR (Matches your Screenshots) ---
const RecurringRuleEditor: React.FC<{ 
    event: EventDetails; 
    onSave: (updatedRecurrence: any) => void; 
    onCancel: () => void; 
}> = ({ event, onSave, onCancel }) => {
    // 1. Create a local temporary state for editing
    const [tempRec, setTempRec] = useState(event.recurrence || {
        frequency: 'weekly',
        interval: 1,
        byDay: [],
        endStrategy: 'never',
        count: 5,
        endDate: null
    });

    const dayLabels = [
        { lab: 'S', val: 'SU' }, { lab: 'M', val: 'MO' }, { lab: 'T', val: 'TU' },
        { lab: 'W', val: 'WE' }, { lab: 'T', val: 'TH' }, { lab: 'F', val: 'FR' }, { lab: 'S', val: 'SA' }
    ];

    // Helper to update local temp state
    const updateTemp = (fields: any) => setTempRec({ ...tempRec, ...fields });

    const summaryText = useMemo(() => {
        const freqLabel = tempRec.frequency === 'weekly' ? 'weekly' : tempRec.frequency;
        const dayNames = tempRec.byDay.join(', ');
        const start = new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        let endPart = '';
        if (tempRec.endStrategy === 'after') endPart = `, ${tempRec.count} times`;
        if (tempRec.endStrategy === 'on_date' && tempRec.endDate) endPart = ` until ${tempRec.endDate}`;

        return `Repeats: ${freqLabel} on ${dayNames || 'selected days'}, starting from ${start}${endPart}`;
    }, [tempRec, event.startDate]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-[#125EF8] shadow-xl space-y-6 mt-4 relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Recurring rule</h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Repeat Every */}
            <div className="flex items-center gap-4">
                <span className="text-gray-700 dark:text-gray-300 font-medium w-28">Repeat every</span>
                <div className="flex items-center gap-2">
                    <input 
                        type="number" 
                        className="w-16 p-2 border rounded-md dark:bg-gray-700 dark:text-white" 
                        value={tempRec.interval} 
                        onChange={(e) => updateTemp({ interval: parseInt(e.target.value) || 1 })}
                    />
                    <select 
                        className="p-2 border rounded-md dark:bg-gray-700 dark:text-white"
                        value={tempRec.frequency}
                        onChange={(e) => updateTemp({ frequency: e.target.value })}
                    >
                        <option value="daily">Day</option>
                        <option value="weekly">Week</option>
                        <option value="monthly">Month</option>
                    </select>
                </div>
            </div>

            {/* Days On */}
            <div className="flex items-center gap-4">
                <span className="text-gray-700 dark:text-gray-300 font-medium w-28">On</span>
                <div className="flex gap-2">
                    {dayLabels.map((day) => (
                        <button
                            key={day.val}
                            type="button"
                            onClick={() => {
                                const newDays = tempRec.byDay.includes(day.val) 
                                    ? tempRec.byDay.filter(d => d !== day.val) 
                                    : [...tempRec.byDay, day.val];
                                updateTemp({ byDay: newDays });
                            }}
                            className={`w-9 h-9 rounded-full font-bold flex items-center justify-center transition-all ${
                                tempRec.byDay.includes(day.val) 
                                    ? 'bg-[#125EF8] text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            {day.lab}
                        </button>
                    ))}
                </div>
            </div>

            {/* End Strategy */}
            <div className="flex items-center gap-4 flex-wrap">
                <span className="text-gray-700 dark:text-gray-300 font-medium w-28">End</span>
                <select 
                    className="p-2 border rounded-md dark:bg-gray-700 dark:text-white w-32"
                    value={tempRec.endStrategy}
                    onChange={(e) => updateTemp({ endStrategy: e.target.value })}
                >
                    <option value="never">Never</option>
                    <option value="after">After</option>
                    <option value="on_date">On date</option>
                </select>

                {tempRec.endStrategy === 'after' && (
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            className="w-16 p-2 border rounded-md dark:bg-gray-700 dark:text-white" 
                            value={tempRec.count || 1} 
                            onChange={(e) => updateTemp({ count: parseInt(e.target.value) || 1 })}
                        />
                        <span className="text-gray-400 text-sm">occurrence(s)</span>
                    </div>
                )}

                {tempRec.endStrategy === 'on_date' && (
                    <input 
                        type="date" 
                        className="p-2 border rounded-md dark:bg-gray-700 dark:text-white"
                        value={tempRec.endDate || ''}
                        onChange={(e) => updateTemp({ endDate: e.target.value })}
                    />
                )}
            </div>

            {/* Summary */}
            <div className="pt-4 border-t border-gray-100">
                <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm">{summaryText}</p>
                <p className="text-xs text-gray-400 mt-2">Recurring Rules supported by Apple, Google, Office365...</p>
            </div>

            {/* WORKING BUTTONS */}
            <div className="flex justify-end gap-4 pt-2">
                <button 
                    type="button"
                    onClick={onCancel} 
                    className="text-gray-500 font-bold hover:text-gray-700 px-4 py-2"
                >
                    Cancel
                </button>
                <button 
                    type="button"
                    onClick={() => onSave(tempRec)} 
                    className="bg-[#125EF8] text-white px-8 py-2 rounded-md font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

interface EditableEventCardProps {
    event: EventDetails;
    index: number;
    onChange: (index: number, updatedEvent: EventDetails) => void;
    onDelete: (index: number) => void;
}

const EditableEventCard: React.FC<{ event: EventDetails; index: number; onChange: (index: number, updated: EventDetails) => void; onDelete: (index: number) => void }> = ({ event, index, onChange, onDelete }) => {
    const [localEvent, setLocalEvent] = useState(event);

    const [isEditingRecurrence, setIsEditingRecurrence] = useState(false);


    useEffect(() => { setLocalEvent(event); }, [event]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updated = { ...localEvent, [name]: value };
        setLocalEvent(updated);
        onChange(index, updated);
    };

    const labelClass = "block mb-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400";
    const inputClass = "block w-full text-sm p-2.5 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#125EF8] outline-none";

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 w-full space-y-4 relative border border-gray-200 dark:border-gray-700">
            <button onClick={() => onDelete(index)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            </button>

            <div>
                <label className={labelClass}>Event Title</label>
                <input type="text" name="title" value={localEvent.title || ''} onChange={handleInputChange} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Start Date (MM/DD/YYYY)</label>
                    <input type="text" name="startDate" value={formatDisplay(localEvent.startDate)} onChange={handleInputChange} className={inputClass} placeholder="MM/DD/YYYY, 12:00 AM" />
                </div>
                <div>
                    <label className={labelClass}>End Date (MM/DD/YYYY)</label>
                    <input type="text" name="endDate" value={formatDisplay(localEvent.endDate)} onChange={handleInputChange} className={inputClass} placeholder="MM/DD/YYYY, 12:00 AM" />
                </div>
            </div>

            <div>
                <label className={labelClass}>Location</label>
                <input type="text" name="location" value={localEvent.location || ''} onChange={handleInputChange} className={inputClass} />
            </div>

            <div className="py-2 border-t border-b border-gray-50 dark:border-gray-700">
                {!isEditingRecurrence ? (
                    <div className="flex items-center justify-between">
                        {localEvent.recurrence ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    🔄 Recurring {localEvent.recurrence.frequency}
                                </span>
                                <button 
                                    onClick={() => setIsEditingRecurrence(true)}
                                    className="text-xs font-bold text-[#125EF8] hover:underline"
                                >
                                    Edit Rule
                                </button>
                                <button 
                                    onClick={() => {
                                        const updated = { ...localEvent, recurrence: null };
                                        setLocalEvent(updated);
                                        onChange(index, updated);
                                    }}
                                    className="text-xs font-bold text-red-400 hover:text-red-600 ml-2"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsEditingRecurrence(true)}
                                className="text-sm font-bold text-[#125EF8] hover:underline flex items-center gap-1"
                            >
                                <span className="text-lg">+</span> Add Recurring Rule
                            </button>
                        )}
                    </div>
                ) : (
                    <RecurringRuleEditor 
                        event={localEvent} 
                        onSave={(updatedRec) => {
                            const newEvent = { ...localEvent, recurrence: updatedRec };
                            setLocalEvent(newEvent);
                            onChange(index, newEvent);
                            setIsEditingRecurrence(false);
                        }}
                        onCancel={() => setIsEditingRecurrence(false)}
                    />
                )}
            </div>

            {/* Recurrence Selection / Editor */}
            {/* {!localEvent.recurrence ? (
                <button 
                    onClick={() => setLocalEvent({...localEvent, recurrence: { frequency: 'weekly', interval: 1, byDay: [], endStrategy: 'never', count: 1, endDate: null }})}
                    className="text-sm font-bold text-[#125EF8] hover:underline"
                >
                    + Add Recurring Rule
                </button>
            ) : (
                <RecurringRuleEditor 
                    event={localEvent} 
                    onChange={(updated) => { setLocalEvent(updated); onChange(index, updated); }} 
                />
            )} */}

            <div>
                <label className={labelClass}>Description</label>
                <textarea name="description" value={localEvent.description || ''} onChange={handleInputChange} className={`${inputClass} h-24 resize-y`} />
            </div>
        </div>
    );
};


const timezones = [
  "Africa/Abidjan", "Africa/Accra", "Africa/Algiers", "Africa/Bissau", "Africa/Cairo", "Africa/Casablanca",
  "Africa/Ceuta", "Africa/El_Aaiun", "Africa/Johannesburg", "Africa/Juba", "Africa/Khartoum", "Africa/Lagos",
  "Africa/Maputo", "Africa/Monrovia", "Africa/Nairobi", "Africa/Ndjamena", "Africa/Sao_Tome", "Africa/Tripoli",
  "Africa/Tunis", "Africa/Windhoek", "America/Adak", "America/Anchorage", "America/Araguaina",
  "America/Argentina/Buenos_Aires", "America/Argentina/Catamarca", "America/Argentina/Cordoba",
  "America/Argentina/Jujuy", "America/Argentina/La_Rioja", "America/Argentina/Mendoza",
  "America/Argentina/Rio_Gallegos", "America/Argentina/Salta", "America/Argentina/San_Juan",
  "America/Argentina/San_Luis", "America/Argentina/Tucuman", "America/Argentina/Ushuaia", "America/Asuncion",
  "America/Atikokan", "America/Bahia", "America/Bahia_Banderas", "America/Barbados", "America/Belem",
  "America/Belize", "America/Blanc-Sablon", "America/Boa_Vista", "America/Bogota", "America/Boise",
  "America/Cambridge_Bay", "America/Campo_Grande", "America/Campo_Grande", "America/Cancun", "America/Caracas", "America/Cayenne",
  "America/Chicago", "America/Chihuahua", "America/Costa_Rica", "America/Creston", "America/Cuiaba",
  "America/Curacao", "America/Danmarkshavn", "America/Dawson", "America/Dawson_Creek", "America/Denver",
  "America/Detroit", "America/Edmonton", "America/Eirunepe", "America/El_Salvador", "America/Fort_Nelson",
  "America/Fortaleza", "America/Glace_Bay", "America/Goose_Bay", "America/Grand_Turk", "America/Guatemala",
  "America/Guayaquil", "America/Guyana", "America/Halifax", "America/Havana", "America/Hermosillo",
  "America/Indiana/Indianapolis", "America/Indiana/Knox", "America/Indiana/Marengo", "America/Indiana/Petersburg",
  "America/Indiana/Tell_City", "America/Indiana/Vevay", "America/Indiana/Vincennes", "America/Indiana/Winamac",
  "America/Inuvik", "America/Iqaluit", "America/Jamaica", "America/Juneau", "America/Kentucky/Louisville",
  "America/Kentucky/Monticello", "America/La_Paz", "America/Lima", "America/Los_Angeles", "America/Maceio",
  "America/Managua", "America/Manaus", "America/Martinique", "America/Matamoros", "America/Mazatlan",
  "America/Menominee", "America/Merida", "America/Metlakatla", "America/Mexico_City", "America/Miquelon",
  "America/Moncton", "America/Monterrey", "America/Montevideo", "America/Nassau", "America/New_York",
  "America/Nipigon", "America/Nome", "America/Noronha", "America/North_Dakota/Beulah",
  "America/North_Dakota/Center", "America/North_Dakota/New_Salem", "America/Nuuk", "America/Ojinaga",
  "America/Panama", "America/Pangnirtung", "America/Paramaribo", "America/Phoenix", "America/Port-au-Prince",
  "America/Port_of_Spain", "America/Porto_Velho", "America/Puerto_Rico", "America/Punta_Arenas",
  "America/Rainy_River", "America/Rankin_Inlet", "America/Recife", "America/Regina", "America/Resolute",
  "America/Rio_Branco", "America/Santarem", "America/Santiago", "America/Santo_Domingo", "America/Sao_Paulo",
  "America/Scoresbysund", "America/Sitka", "America/St_Johns", "America/Swift_Current", "America/Tegucigalpa",
  "America/Thule", "America/Thunder_Bay", "America/Tijuana", "America/Toronto", "America/Vancouver",
  "America/Whitehorse", "America/Winnipeg", "America/Yakutat", "America/Yellowknife", "Antarctica/Casey",
  "Antarctica/Davis", "Antarctica/DumontDUrville", "Antarctica/Macquarie", "Antarctica/Mawson",
  "Antarctica/Palmer", "Antarctica/Rothera", "Antarctica/Syowa", "Antarctica/Troll", "Antarctica/Vostok",
  "Asia/Almaty", "Asia/Amman", "Asia/Anadyr", "Asia/Aqtau", "Asia/Aqtobe", "Asia/Ashgabat", "Asia/Atyrau",
  "Asia/Baghdad", "Asia/Baku", "Asia/Bangkok", "Asia/Barnaul", "Asia/Beirut", "Asia/Bishkek", "Asia/Brunei",
  "Asia/Chita", "Asia/Choibalsan", "Asia/Colombo", "Asia/Damascus", "Asia/Dhaka", "Asia/Dili", "Asia/Dubai",
  "Asia/Dushanbe", "Asia/Famagusta", "Asia/Gaza", "Asia/Hebron", "Asia/Ho_Chi_Minh", "Asia/Hong_Kong",
  "Asia/Hovd", "Asia/Irkutsk", "Asia/Jakarta", "Asia/Jayapura", "Asia/Jerusalem", "Asia/Kabul",
  "Asia/Kamchatka", "Asia/Karachi", "Asia/Kathmandu", "Asia/Khandyga", "Asia/Kolkata", "Asia/Krasnoyarsk",
  "Asia/Kuala_Lumpur", "Asia/Kuching", "Asia/Macau", "Asia/Magadan", "Asia/Makassar", "Asia/Manila",
  "Asia/Nicosia", "Asia/Novokuznetsk", "Asia/Novosibirsk", "Asia/Omsk", "Asia/Oral", "Asia/Pontianak",
  "Asia/Pyongyang", "Asia/Qatar", "Asia/Qostanay", "Asia/Qyzylorda", "Asia/Riyadh", "Asia/Sakhalin",
  "Asia/Samarkand", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Srednekolymsk", "Asia/Taipei",
  "Asia/Tashkent", "Asia/Tbilisi", "Asia/Tehran", "Asia/Thimphu", "Asia/Tokyo", "Asia/Tomsk",
  "Asia/Ulaanbaatar", "Asia/Urumqi", "Asia/Ust-Nera", "Asia/Vladivostok", "Asia/Yakutsk", "Asia/Yangon",
  "Asia/Yekaterinburg", "Asia/Yerevan", "Atlantic/Azores", "Atlantic/Bermuda", "Atlantic/Canary",
  "Atlantic/Cape_Verde", "Atlantic/Faroe", "Atlantic/Madeira", "Atlantic/Reykjavik", "Atlantic/South_Georgia",
  "Atlantic/Stanley", "Australia/Adelaide", "Australia/Brisbane", "Australia/Broken_Hill", "Australia/Currie",
  "Australia/Darwin", "Australia/Eucla", "Australia/Hobart", "Australia/Lindeman", "Australia/Lord_Howe",
  "Australia/Melbourne", "Australia/Perth", "Australia/Sydney", "Europe/Amsterdam", "Europe/Andorra",
  "Europe/Astrakhan", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin", "Europe/Brussels",
  "Europe/Bucharest", "Europe/Budapest", "Europe/Chisinau", "Europe/Copenhagen", "Europe/Dublin",
  "Europe/Gibraltar", "Europe/Helsinki", "Europe/Istanbul", "Europe/Kaliningrad", "Europe/Kiev", "Europe/Kirov",
  "Europe/Lisbon", "Europe/London", "Europe/Luxembourg", "Europe/Madrid", "Europe/Malta", "Europe/Minsk",
  "Europe/Monaco", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Riga",
  "Europe/Rome", "Europe/Samara", "Europe/Saratov", "Europe/Simferopol", "Europe/Sofia", "Europe/Stockholm",
  "Europe/Tallinn", "Europe/Tirane", "Europe/Ulyanovsk", "Europe/Uzhgorod", "Europe/Vienna", "Europe/Vilnius",
  "Europe/Volgograd", "Europe/Warsaw", "Europe/Zaporozhye", "Europe/Zurich", "Indian/Chagos",
  "Indian/Christmas", "Indian/Cocos", "Indian/Kerguelen", "Indian/Mahe", "Indian/Maldives", "Indian/Mauritius",
  "Indian/Reunion", "Pacific/Apia", "Pacific/Auckland", "Pacific/Bougainville", "Pacific/Chatham",
  "Pacific/Chuuk", "Pacific/Easter", "Pacific/Efate", "Pacific/Enderbury", "Pacific/Fakaofo", "Pacific/Fiji",
  "Pacific/Funafuti", "Pacific/Galapagos", "Pacific/Gambier", "Pacific/Guadalcanal", "Pacific/Guam",
  "Pacific/Honolulu", "Pacific/Kiritimati", "Pacific/Kosrae", "Pacific/Kwajalein", "Pacific/Majuro",
  "Pacific/Marquesas", "Pacific/Nauru", "Pacific/Niue", "Pacific/Norfolk", "Pacific/Noumea",
  "Pacific/Pago_Pago", "Pacific/Palau", "Pacific/Pitcairn", "Pacific/Pohnpei", "Pacific/Port_Moresby",
  "Pacific/Rarotonga", "Pacific/Tahiti", "Pacific/Tarawa", "Pacific/Tongatapu", "Pacific/Wake", "Pacific/Wallis",
  "UTC",
];

// Calculate offsets once
const getTimezoneOffset = (timeZone: string) => {
    try {
        const now = new Date();
        const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(now).find(p => p.type === 'timeZoneName');
        // Part value will be "GMT-05:00" or similar
        return part ? part.value.replace('GMT', 'GMT') : '';
    } catch (e) {
        return '';
    }
};

const timezoneOptions = timezones.map(tz => ({
    value: tz,
    offset: getTimezoneOffset(tz),
    label: tz.replace(/_/g, ' ')
})).sort((a, b) => a.label.localeCompare(b.label));


interface TimezoneSelectorProps {
    selectedTimezone: string;
    onTimezoneChange: (tz: string) => void;
}

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ selectedTimezone, onTimezoneChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredTimezones = useMemo(() => {
         const lowerSearch = searchTerm.toLowerCase();
         return timezoneOptions.filter(tz =>
             tz.label.toLowerCase().includes(lowerSearch) || tz.offset.toLowerCase().includes(lowerSearch)
         );
    }, [searchTerm]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const getDisplayLabel = (tzValue: string) => {
        const option = timezoneOptions.find(o => o.value === tzValue);
        if (!option) return tzValue.replace(/_/g, ' ');
        return `(${option.offset}) ${option.label}`;
    };
    
    return (
        <div className="w-full max-w-md mx-auto md:mx-0 relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 text-center md:text-left">
                Event Timezone
            </label>
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search timezone..."
                    value={isOpen ? searchTerm : getDisplayLabel(selectedTimezone)}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm('');
                    }}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    className="block w-full pl-10 pr-4 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md focus:ring-[#125EF8] focus:border-[#125EF8] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                />
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                 </div>
                 {isOpen && (
                     <div className="absolute z-50 right-2 top-1/2 transform -translate-y-1/2">
                         <button onClick={() => { setIsOpen(false); setSearchTerm(''); }} className="text-gray-400 hover:text-gray-500">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                         </button>
                     </div>
                 )}
            </div>
            
            {isOpen && (
                <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {filteredTimezones.length === 0 ? (
                        <li className="text-gray-500 cursor-default select-none relative py-2 pl-3 pr-9">No timezones found</li>
                    ) : (
                        filteredTimezones.map((tz) => (
                            <li
                                key={tz.value}
                                className={`cursor-pointer select-none relative py-2 pl-4 pr-12 hover:bg-[#e7f0ff] dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200`}
                                onClick={() => {
                                    onTimezoneChange(tz.value);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`block truncate ${tz.value === selectedTimezone ? 'font-semibold text-[#125EF8]' : ''}`}>
                                        <span className="text-gray-500 dark:text-gray-400 mr-2">({tz.offset})</span>
                                        {tz.label}
                                    </span>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

interface ResultsDisplayProps {
  events: EventDetails[];
  onDownload: () => void;
  onReset: () => void;
  timezone: string;
  onTimezoneChange: (tz: string) => void;
  onEventChange: (index: number, updatedEvent: EventDetails) => void;
  onDeleteEvent: (index: number) => void;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ events, onDownload, onReset, timezone, onTimezoneChange, onEventChange, onDeleteEvent }) => (
    <div className="w-full max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Extracted Events</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 -mt-4">
            Verify and edit the details below. Events will be created in the <strong className="font-semibold text-gray-800 dark:text-gray-200">{timezone.replace(/_/g, ' ')}</strong> timezone.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
            {events.map((event, index) => <EditableEventCard key={index} index={index} event={event} onChange={onEventChange} onDelete={onDeleteEvent} />)}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mt-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <TimezoneSelector selectedTimezone={timezone} onTimezoneChange={onTimezoneChange} />
                <button
                    onClick={onDownload}
                    className="w-full md:w-auto bg-[#125EF8] hover:bg-[#0f4abf] text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg"
                >
                    Download .ics File
                </button>
            </div>
        </div>
        <div className="text-center pt-2">
            <button
                onClick={onReset}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full transition-transform transform hover:scale-105 shadow-lg"
            >
                Start Over
            </button>
        </div>
    </div>
);


// --- Main App Component ---

export default function App() {
  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
  const [events, setEvents] = useState<EventDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(() => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        return 'UTC'; // Fallback for older environments
    }
  });

const processData = useCallback(async (action: Promise<any>) => {
    setIsLoading(true);
    setError(null);
    try {
        const result = await action;
        
        // Ensure result is an array. PHP might return {events: []} or just []
        const extractedEvents = Array.isArray(result) ? result : (result.events || []);

        if (!extractedEvents || extractedEvents.length === 0) {
            setError("Oops! We couldn't find any clear event details on that page. Try 'Paste Text' instead.");
            setEvents(null);
        } else {
            setEvents(extractedEvents);
        }
    } catch (err: any) {
        console.error("Extraction Error:", err);
        setError(err.message || "An error occurred during extraction.");
    } finally {
        setIsLoading(false);
    }
}, []);
  const handleFileUpload = useCallback((files: File[]) => {
     processData(extractEventsFromFiles(files));
  }, [processData]);

  const handleTextSubmit = useCallback((text: string) => {
    if (!text.trim()) {
        setError("Please paste some text before analyzing.");
        return;
    }
    processData(extractEventsFromText(text));
  }, [processData]);

  const handleUrlSubmit = useCallback((url: string) => {
    if (!url.trim()) {
        setError("Please enter a URL before analyzing.");
        return;
    }
    try {
        new URL(url);
    } catch (_) {
        setError("Please enter a valid URL.");
        return;
    }
    processData(extractEventsFromUrl(url));
  }, [processData]);


  const handleCameraCapture = useCallback((file: File) => {
      // Camera still produces a single file, but we treat it as a list of 1
      handleFileUpload([file]);
  }, [handleFileUpload]);

  const handleEventChange = useCallback((index: number, updatedEvent: EventDetails) => {
    setEvents(currentEvents => {
        if (!currentEvents) return null;
        const newEvents = [...currentEvents];
        newEvents[index] = updatedEvent;
        return newEvents;
    });
  }, []);

  const handleDeleteEvent = useCallback((index: number) => {
      setEvents(currentEvents => {
          if (!currentEvents) return null;
          return currentEvents.filter((_, i) => i !== index);
      });
  }, []);

   const handleDownload = useCallback(() => {
    if (!events || events.length === 0) return;

    const eventsForExport = events.map(event => {
        // UI string "01/27/2026, 9:00 AM" 
        const startDateObj = new Date(event.startDate);
        const endDateObj = new Date(event.endDate);

        return {
            ...event,
            startDate: !isNaN(startDateObj.getTime()) ? startDateObj.toISOString() : event.startDate,
            endDate: !isNaN(endDateObj.getTime()) ? endDateObj.toISOString() : event.endDate,
        };
    });

    const calendarName = events.length === 1 && events[0]?.title ? events[0].title : "Exported Calendar";
    const icsContent = generateIcsContent(eventsForExport, timezone, calendarName);
    const filename = 'calendar_events.ics';
    downloadIcsFile(icsContent, filename);
}, [events, timezone]);

  const handleReset = useCallback(() => {
    setEvents(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const CurrentView = useMemo(() => {
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return (
        <div className="text-center p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded-lg max-w-xl mx-auto">
          <p className="font-bold">Oops! Something went wrong.</p>
          <p>{error}</p>
          <button
            onClick={handleReset}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full"
          >
            Try Again
          </button>
        </div>
      );
    }
    if (events) {
      return (
        <ResultsDisplay 
            events={events} 
            onDownload={handleDownload} 
            onReset={handleReset} 
            timezone={timezone} 
            onTimezoneChange={setTimezone} 
            onEventChange={handleEventChange} 
            onDeleteEvent={handleDeleteEvent}
        />
      );
    }
    return (
        <>
            <div className="space-y-4">
                <InputMethodSelector currentMethod={inputMethod} onMethodChange={setInputMethod} />
                {inputMethod === 'upload' && <FileUpload onFileUpload={handleFileUpload} />}
                {inputMethod === 'paste' && <TextInput onTextSubmit={handleTextSubmit} />}
                {inputMethod === 'url' && <UrlInput onUrlSubmit={handleUrlSubmit} />}
                {inputMethod === 'camera' && <CameraCapture onCapture={handleCameraCapture} onCancel={() => setInputMethod('upload')} />}
            </div>
        </>
    );
  }, [isLoading, error, events, handleDownload, handleReset, handleFileUpload, timezone, inputMethod, handleTextSubmit, handleUrlSubmit, handleEventChange, handleCameraCapture, handleDeleteEvent]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <div className="container mx-auto px-4 py-8">
        <Header />
        <main className="mt-8">
          <div className="mt-6">
            {CurrentView}
          </div>
        </main>
      </div>
    </div>
  );
}