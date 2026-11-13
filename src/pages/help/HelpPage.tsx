import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  FileQuestion,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { FAQS } from '../../data/mockData';
import { useTickets } from '../../context/TicketContext';
import { toast } from 'sonner';

export const HelpPage: React.FC = () => {
  const { createTicket } = useTickets();
  const [search, setSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact form state
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase()) ||
      faq.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast.error('Please enter a subject and message');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      createTicket({
        title: contactSubject,
        description: contactMessage,
        category: 'General Inquiry',
        priority: 'Medium',
        customerName: 'Help Desk Visitor',
        customerEmail: contactEmail || 'support-requester@example.com',
        customerCompany: 'Community User',
      });
      setIsSubmitting(false);
      setContactSubject('');
      setContactMessage('');
      setContactEmail('');
      toast.success('Your support request was logged as a new ticket!');
    }, 400);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="text-center py-6 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl shadow-elevated">
        <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-3">
          <LifeBuoy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          How can we help you today?
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-brand-100 max-w-xl mx-auto">
          Explore documentation guides, frequently asked questions, or reach out to the IssueFlow support engineering team.
        </p>

        {/* Knowledge search box */}
        <div className="mt-6 max-w-lg mx-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs, documentation, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xs sm:text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
      </div>

      {/* 3 Quick Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover className="cursor-pointer">
          <CardContent className="p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Platform Documentation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Step-by-step developer guides for setting up agents, SLAs, and API integrations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover className="cursor-pointer">
          <CardContent className="p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Copilot Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Learn how automated triage, sentiment scoring, and suggested resolutions work.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover className="cursor-pointer">
          <CardContent className="p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Security & Compliance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                SOC2 overview, encrypted data handling, and role-based access control rules.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: FAQs Accordion + Contact Support Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs Accordion (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-brand-600 dark:text-brand-400" /> Frequently Asked Questions
            </h2>
            <span className="text-xs text-slate-500">
              Showing {filteredFaqs.length} articles
            </span>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <Card key={faq.question} className="overflow-hidden transition-all">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                      {faq.answer}
                      <div className="mt-2 text-[10px] text-slate-400">
                        Category: <span className="font-medium text-slate-600 dark:text-slate-300">{faq.category}</span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact Support Form */}
        <div>
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-sm">Submit a Question</CardTitle>
                <CardDescription>Our engineering desk usually replies within 2 hours</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                <Input
                  label="Your Email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
                <Input
                  label="Inquiry Subject"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="e.g. Question about SAML SSO"
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Describe your issue or question in detail..."
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 text-xs p-2.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
