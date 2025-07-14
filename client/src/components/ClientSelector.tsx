import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Users, Search, X } from "lucide-react";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  goal: string;
  weight: number;
  goalWeight: number;
  programStartDate: string;
  onboardingCompleted: boolean;
  unansweredCount?: number;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClient: string;
  onClientSelect: (clientId: string) => void;
  groupChatUnread: number;
  className?: string;
}

export default function ClientSelector({
  clients,
  selectedClient,
  onClientSelect,
  groupChatUnread,
  className = ""
}: ClientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    return clients.filter(client =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    setShowSearch(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Toggle and Input */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
          className="text-gray-400 hover:text-white"
        >
          <Search className="w-4 h-4" />
        </Button>
        
        {showSearch && (
          <div className="flex-1 relative">
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-surface border-gray-600 text-white placeholder-gray-400"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Group Chat Option */}
      <Card className={`cursor-pointer transition-all ${
        selectedClient === "group-chat" 
          ? "bg-primary-500/20 border-primary-500" 
          : "bg-surface border-gray-700 hover:bg-gray-800"
      }`}>
        <CardContent 
          className="p-4"
          onClick={() => onClientSelect("group-chat")}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-primary-500/20 p-2 rounded-full">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">Group Chat</div>
              <div className="text-sm text-gray-400">All clients discussion</div>
            </div>
            {groupChatUnread > 0 && (
              <Badge variant="default" className="bg-red-500 text-white">
                {groupChatUnread}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Results Counter */}
      {searchTerm && (
        <div className="text-sm text-gray-400 px-2">
          {filteredClients.length} of {clients.length} clients
        </div>
      )}

      {/* Client List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {searchTerm ? "No clients found" : "No clients available"}
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card 
              key={client.id}
              className={`cursor-pointer transition-all ${
                selectedClient === client.id 
                  ? "bg-primary-500/20 border-primary-500" 
                  : "bg-surface border-gray-700 hover:bg-gray-800"
              }`}
            >
              <CardContent 
                className="p-4"
                onClick={() => onClientSelect(client.id)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={client.profileImageUrl || "/default-avatar.png"}
                    alt={`${client.firstName} ${client.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {client.firstName} {client.lastName}
                    </div>
                    <div className="text-sm text-gray-400 truncate">
                      {client.email}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {client.unansweredCount && client.unansweredCount > 0 && (
                      <Badge variant="default" className="bg-red-500 text-white">
                        {client.unansweredCount}
                      </Badge>
                    )}
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}