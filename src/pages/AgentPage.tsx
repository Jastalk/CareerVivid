import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AgentChat } from '../components/AgentChat';
import { Tool } from '../agent/Tool';
import { Type } from '@google/genai';
import '../components/Landing/live/liveLanding.css';

const getCurrentTimeTool: Tool = {
  name: "get_current_time",
  description: "Get the current time in the user's local timezone.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: []
  },
  execute: async () => {
    return new Date().toLocaleTimeString();
  }
};

const changeBackgroundColorTool: Tool = {
  name: "change_background_color",
  description: "Change the background color of the web page. Use hex codes or standard CSS color names.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      color: {
        type: Type.STRING,
        description: "The CSS color value."
      }
    },
    required: ["color"]
  },
  execute: async (args: { color: string }) => {
    document.body.style.backgroundColor = args.color;
    return `Background color changed to ${args.color}`;
  }
};

export const AgentPage: React.FC = () => {
  // This sandbox agent accepts only an explicit user-provided BYO key.
  // Do not bundle production Gemini keys into the browser.
  const apiKey = localStorage.getItem('gemini_api_key') || '';

  return (
    /*
     * `.cvl` paints the desk ground and its dot grid, so it has to be the
     * full-bleed shell — on the centred container it painted a stripe down the
     * middle and left the gutters to whatever the app shell paints. Width is
     * limited on the inner wrapper instead, matching Dashboard.tsx.
     */
    <div className="cvl min-h-screen w-full">
      <div className="mx-auto h-[calc(100vh-100px)] max-w-4xl p-6">
        <div className="mb-6">
          <p className="cvl-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--cvl-muted)' }}>
            sandbox
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Web Agent</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: 'var(--cvl-muted)' }}>
            This autonomous agent runs entirely in your browser using the universal{' '}
            <code className="cvl-mono">QueryEngine</code> abstraction. It has access to tools that can
            manipulate the DOM or query local state.
          </p>
        </div>

        {!apiKey ? (
          <div
            className="mb-6 flex items-start gap-2.5 rounded-xl border p-4"
            style={{ borderColor: 'var(--cvl-amber)', background: 'var(--cvl-amber-soft)' }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--cvl-amber)' }} aria-hidden="true" />
            <p className="text-[13px] leading-relaxed">
              You need a Gemini API key to use the agent. Set{' '}
              <code className="cvl-mono">localStorage.setItem('gemini_api_key', 'YOUR_KEY')</code> in your
              console and refresh.
            </p>
          </div>
        ) : (
          <div className="cvl-panel h-[500px] overflow-hidden">
            <AgentChat
              apiKey={apiKey}
              tools={[getCurrentTimeTool, changeBackgroundColorTool]}
              systemInstruction="You are a helpful web assistant. You can change the background color of the page and tell the time."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPage;
