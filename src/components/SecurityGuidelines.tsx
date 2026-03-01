import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Smartphone, 
  Wifi, 
  RefreshCw, 
  Mail, 
  Database, 
  X,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Guideline {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  steps: string[];
  severity: 'Critical' | 'High' | 'Medium';
}

const guidelines: Guideline[] = [
  {
    id: 'passwords',
    title: 'Password Management',
    description: 'Create strong, unique passwords for every account to prevent credential stuffing attacks.',
    icon: <Key className="w-5 h-5" />,
    severity: 'Critical',
    steps: [
      'Use at least 12-16 characters.',
      'Mix uppercase, lowercase, numbers, and symbols.',
      'Avoid personal information like birthdays or names.',
      'Use a reputable password manager (e.g., Bitwarden, 1Password).',
      'Never reuse passwords across different platforms.'
    ]
  },
  {
    id: 'mfa',
    title: 'Multi-Factor Authentication',
    description: 'Add an extra layer of security beyond just a password to protect your accounts.',
    icon: <Smartphone className="w-5 h-5" />,
    severity: 'Critical',
    steps: [
      'Enable MFA on all sensitive accounts (Email, Banking, Social Media).',
      'Prefer Authenticator Apps (Google, Microsoft) over SMS.',
      'Use hardware keys (YubiKey) for maximum security.',
      'Save your backup/recovery codes in a secure offline location.'
    ]
  },
  {
    id: 'phishing',
    title: 'Phishing Awareness',
    description: 'Learn to identify and avoid deceptive emails, messages, and websites.',
    icon: <Mail className="w-5 h-5" />,
    severity: 'High',
    steps: [
      'Check the sender\'s actual email address, not just the display name.',
      'Look for urgent or threatening language.',
      'Hover over links to see the real destination URL.',
      'Be wary of unexpected attachments or requests for sensitive data.',
      'When in doubt, contact the organization through an official channel.'
    ]
  },
  {
    id: 'updates',
    title: 'Software Updates',
    description: 'Keep your operating system and applications updated to patch known vulnerabilities.',
    icon: <RefreshCw className="w-5 h-5" />,
    severity: 'High',
    steps: [
      'Enable automatic updates for your OS (Windows, macOS, Linux).',
      'Regularly update your web browser and its extensions.',
      'Don\'t ignore "Update Available" notifications on your phone.',
      'Restart your devices periodically to apply pending patches.'
    ]
  },
  {
    id: 'wifi',
    title: 'Secure Connectivity',
    description: 'Protect your data when connecting to the internet, especially on public networks.',
    icon: <Wifi className="w-5 h-5" />,
    severity: 'Medium',
    steps: [
      'Use a VPN when connecting to public Wi-Fi.',
      'Disable "Auto-Join" for unknown Wi-Fi networks.',
      'Ensure your home Wi-Fi uses WPA3 or WPA2 encryption.',
      'Change the default administrator password on your router.'
    ]
  },
  {
    id: 'backup',
    title: 'Data Backups',
    description: 'Ensure your important files are safe from hardware failure or ransomware.',
    icon: <Database className="w-5 h-5" />,
    severity: 'High',
    steps: [
      'Follow the 3-2-1 rule: 3 copies, 2 different media, 1 offsite.',
      'Use automated cloud backup services.',
      'Regularly test your backups to ensure they can be restored.',
      'Encrypt your local backup drives.'
    ]
  }
];

interface SecurityGuidelinesProps {
  onClose: () => void;
}

export default function SecurityGuidelines({ onClose }: SecurityGuidelinesProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl"
    >
      <div className="w-full max-w-5xl h-full max-h-[85vh] bg-[#0d0d0d] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <ShieldCheck className="w-7 h-7 text-green-400" />
            </div>
            <div>
              <h2 className="font-mono text-2xl font-bold tracking-tight glow-text text-white uppercase">Security Protocol Vault</h2>
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Essential Cyber Hygiene & Best Practices</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all border border-transparent hover:border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 cyber-grid">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {guidelines.map((guide, idx) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all group relative overflow-hidden"
              >
                {/* Severity Badge */}
                <div className={cn(
                  "absolute top-4 right-4 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-widest border",
                  guide.severity === 'Critical' ? "bg-red-500/20 border-red-500/30 text-red-400" :
                  guide.severity === 'High' ? "bg-orange-500/20 border-orange-500/30 text-orange-400" :
                  "bg-blue-500/20 border-blue-500/30 text-blue-400"
                )}>
                  {guide.severity}
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-white/60 group-hover:text-green-400 group-hover:border-green-500/30 transition-all">
                    {guide.icon}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">{guide.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{guide.description}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        Actionable Steps
                      </h4>
                      <ul className="space-y-1.5">
                        {guide.steps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2 text-xs text-white/70">
                            <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-10 p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-500 shrink-0" />
            <p className="text-sm text-yellow-500/80 font-mono">
              <span className="font-bold uppercase">Note:</span> Security is a continuous process, not a one-time setup. Regularly review these protocols to stay ahead of evolving threats.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
