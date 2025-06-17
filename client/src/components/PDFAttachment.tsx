import { ExternalLink, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFAttachmentProps {
  pdfPath: string;
  thumbnailPath?: string;
  filename: string;
  title?: string;
}

export default function PDFAttachment({ pdfPath, thumbnailPath, filename, title }: PDFAttachmentProps) {
  const handleDownload = () => {
    window.open(pdfPath, '_blank');
  };

  const handleView = () => {
    window.open(pdfPath, '_blank');
  };

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 mt-3 max-w-sm">
      <div className="flex items-start space-x-3">
        {/* PDF Thumbnail or Icon */}
        <div className="flex-shrink-0">
          {thumbnailPath && thumbnailPath !== '/icons/pdf-icon.png' ? (
            <img 
              src={thumbnailPath}
              alt="PDF Preview"
              className="w-16 h-20 object-cover rounded border border-gray-500 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleView}
            />
          ) : (
            <div 
              className="w-16 h-20 bg-red-600/20 border border-red-500/30 rounded flex items-center justify-center cursor-pointer hover:bg-red-600/30 transition-colors"
              onClick={handleView}
            >
              <FileText className="w-8 h-8 text-red-400" />
            </div>
          )}
        </div>
        
        {/* PDF Details */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white text-sm mb-1">
            {title || "Progress Report"}
          </div>
          <div className="text-xs text-gray-400 mb-2 truncate">
            {filename}
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleView}
              className="text-xs h-7 px-2 bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="text-xs h-7 px-2 bg-green-600/20 border-green-500/30 text-green-300 hover:bg-green-600/30"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}