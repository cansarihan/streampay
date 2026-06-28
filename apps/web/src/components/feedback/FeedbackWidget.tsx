import { useState } from 'react';
import { MessageSquarePlus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '../../lib/wallet';
import { api } from '../../lib/api';
import { track } from '../../lib/analytics';
import { cn } from '../../lib/cn';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, Select, Textarea } from '../ui/Field';

export function FeedbackWidget() {
  const { address } = useWallet();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await api.feedback({
        wallet: address,
        rating: rating || null,
        message: message.trim(),
        category,
      });
      track('feedback_submitted', { rating, category });
      toast.success('Thanks for the feedback!');
      setOpen(false);
      setMessage('');
      setRating(0);
      setCategory('general');
    } catch {
      toast.error('Could not send feedback', { description: 'Is the API running?' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Share feedback"
        className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-aqua to-violet text-ink-950 shadow-[0_10px_30px_-8px_rgba(31,227,208,0.5)] transition hover:brightness-110"
      >
        <MessageSquarePlus className="size-5" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Share feedback"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} disabled={!message.trim()} onClick={submit}>
              Send feedback
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-fg-muted">How was your experience?</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}>
                  <Star className={cn('size-7 transition', n <= rating ? 'fill-cliff text-cliff' : 'text-fg-subtle hover:text-fg-muted')} />
                </button>
              ))}
            </div>
          </div>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="praise">Praise</option>
            </Select>
          </Field>
          <Field label="Message">
            <Textarea
              placeholder="What worked well, what didn’t…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
