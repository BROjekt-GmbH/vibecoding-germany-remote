'use client';

import { useState } from 'react';
import { StepWelcome } from './step-welcome';
import { StepHostData } from './step-host-data';
import { StepAuth } from './step-auth';
import { StepTest } from './step-test';
import { StepDone } from './step-done';

export interface HostData {
  name: string;
  hostname: string;
  port: number;
  username: string;
  authMethod: 'key' | 'agent' | 'password';
  privateKey?: string;
  password?: string;
}

const INITIAL_HOST: HostData = {
  name: '', hostname: '', port: 22, username: '', authMethod: 'password',
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [hostData, setHostData] = useState<HostData>(INITIAL_HOST);

  return (
    <div className="max-w-xl mx-auto">
      {/* Fortschrittsbalken */}
      <div className="flex gap-1 mb-8">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#22d3ee]' : 'bg-[#1a2028]'}`} />
        ))}
      </div>

      {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
      {step === 1 && <StepHostData data={hostData} onChange={setHostData} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <StepAuth data={hostData} onChange={setHostData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <StepTest data={hostData} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && <StepDone onAddMore={() => { setHostData(INITIAL_HOST); setStep(1); }} />}
    </div>
  );
}
