export interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
  groundingMetadata?: any;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}
