import React, {useState, useEffect} from "react";
import {useParams, Link} from 'react-router-dom';
import documentService from '../../services/documentService';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import {ArrowLeft, ExternalLink, UserPen} from 'lucide-react';
import PageHeader from "../../components/common/PageHeader";
import Tabs from "../../components/common/Tabs";
import ChatInterface from "../../components/chat/ChatInterface";
import AIActions from "../../components/ai/AIActions";
import FlashcardManager from "../../components/flashcards/FlashcardManager";
import QuizManager from "../../components/quizzes/QuizManager";


const DocumentDetailPage = () => {

    const {id} = useParams();
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Content');

    useEffect(() => {
        let intervalId;

        const fetchDocumentDetails = async (showLoading = true) => {
            if (showLoading) setLoading(true);
            try {
                const data = await documentService.getDocumentById(id);
                setDocument(data);

                if (data.status === 'processing') {
                    if (!intervalId) {
                        intervalId = setInterval(() => {
                            fetchDocumentDetails(false);
                        }, 3000);
                    }
                } else {
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }
            } catch (error) {
                toast.error('Failed to fetch document details.');
                console.error(error);
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            } finally {
                if (showLoading) setLoading(false);
            }
        };

        fetchDocumentDetails(true);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [id]);

    // Helper function to get the full PDF URL
    const getPdfUrl = () => {
        return document?.fileUrl || null;
    };

    // console.log(document);
    
    const renderContent = ()=>{
        if(loading){
            return <Spinner />
        }

        if(!document ||  !document.fileUrl){
            return <div className="text-center p-8"> PDF not available.</div>;
        }

        const pdfUrl = getPdfUrl();

        return(
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-300">
                    <span className="text-sm font-medium text-gray-700">
                        Document Viewer
                    </span>
                    <a 
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        <ExternalLink size={16} />
                        Open in new tab
                    </a>
                </div>
                <div className="bg-gray-100 p-1">
                    <iframe 
                    src={pdfUrl}
                    className="w-full h-[70vh] bg-white rounded border border-gray-300"
                    title="PDF Viewer" 
                    frameBorder="0"
                    style={{
                        colorScheme:'light'
                    }}
                    
                    />
                </div>
            </div>
        );
    };

    const renderChat = ()=>{
        return <ChatInterface />;
    };

    const renderAIActions = ()=>{
        return <AIActions/>
    };

    const renderFlashcardsTab = ()=>{
        return <FlashcardManager documentId={id} />
    };

    const renderQuizzesTab = ()=>{
        return <QuizManager documentId={id}/>
    };


    const tabs = [
        {name: 'Content', label:'Content', content: renderContent()},
        {name: 'Chat', label:'Chat', content: renderChat()},
        {name: 'AI Actions', label:'AI Actions', content: renderAIActions()},
        {name: 'Flashcards', label:'Flashcards', content: renderFlashcardsTab()},
        {name: 'Quizzes', label:'Quizzes', content: renderQuizzesTab()},
    ];

    if (loading && !document) {
        return <Spinner />;
    }

    if (!document) {
        return <div className="text-center p-8"> Document not found.</div>;
    }

    if (document.status === 'processing') {
        return (
            <div>
                <div className="mb-4">
                    <Link to='/documents' className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Documents
                    </Link>
                </div>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                    <Spinner />
                    <h3 className="mt-4 text-lg font-semibold text-slate-800 animate-pulse">Processing Document...</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                        We are extracting text, creating chunks, and generating semantic search vector embeddings. This will take a moment.
                    </p>
                </div>
            </div>
        );
    }

    if (document.status === 'failed') {
        return (
            <div>
                <div className="mb-4">
                    <Link to='/documents' className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Documents
                    </Link>
                </div>
                <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h3 className="text-lg font-semibold text-slate-800">Processing Failed</h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                        We encountered an error while parsing this PDF or generating semantic embeddings. Please delete it and try uploading it again.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div>
            <div className="mb-4">
                <Link to='/documents' className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Documents
                </Link>
            </div>
        <PageHeader title={document.title} />
        <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
};

export default DocumentDetailPage;