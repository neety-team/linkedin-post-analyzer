import { useState } from 'react';
import { apiPost } from '../hooks/useApi';

interface Props {
  onCreated: () => void;
}

export default function CreatorForm({ onCreated }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    try {
      await apiPost('/api/creators', { linkedin_url: url.trim() });
      setUrl('');
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-start">
      <div className="flex-1">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/username/"
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {error && <p className="text-danger text-sm mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="px-6 py-3 bg-accent hover:bg-accent-strong text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {loading ? 'Analizando…' : 'Analizar'}
      </button>
    </form>
  );
}
