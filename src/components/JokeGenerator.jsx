import { useState } from 'react';
import { RefreshCw, Loader } from 'lucide-react';

export default function JokeGenerator() {
  const [joke, setJoke] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJoke = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke');
      if (!response.ok) throw new Error('Failed to fetch joke');
      const data = await response.json();
      setJoke({
        setup: data.setup,
        punchline: data.punchline,
        type: data.type
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            😂 Joke Generator
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Get a random joke to brighten your day
          </p>

          {/* Joke Display */}
          <div className="bg-slate-700 rounded-lg p-6 mb-6 min-h-32 flex flex-col justify-center">
            {loading ? (
              <div className="flex justify-center items-center">
                <Loader className="animate-spin text-blue-400" size={32} />
              </div>
            ) : error ? (
              <p className="text-red-400 text-center">{error}</p>
            ) : joke ? (
              <div>
                <p className="text-slate-300 text-sm uppercase tracking-wide mb-2">
                  {joke.type}
                </p>
                <p className="text-white text-lg font-medium mb-4">{joke.setup}</p>
                <p className="text-blue-300 text-lg font-bold">{joke.punchline}</p>
              </div>
            ) : (
              <p className="text-slate-400 text-center">
                Click the button below to get started!
              </p>
            )}
          </div>

          {/* Get Joke Button */}
          <button
            onClick={fetchJoke}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading...' : 'Get a Joke'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Powered by JokeAPI
        </p>
      </div>
    </div>
  );
}
