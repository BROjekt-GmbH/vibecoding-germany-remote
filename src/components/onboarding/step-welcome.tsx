'use client';

import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-[#22d3ee]/10 flex items-center justify-center">
        <Zap size={32} className="text-[#22d3ee]" />
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-[#c8d6e5]">
          Willkommen bei VCG Remote
        </h1>
        <p className="text-[14px] text-[#8a9bb0] max-w-md leading-relaxed">
          Verbinde dich mit deinen Remote-Hosts und verwalte tmux-Sessions direkt
          im Browser. In wenigen Schritten richtest du deinen ersten Host ein.
        </p>
      </div>

      <Button variant="primary" size="lg" onClick={onNext}>
        Los geht&apos;s
      </Button>
    </div>
  );
}
