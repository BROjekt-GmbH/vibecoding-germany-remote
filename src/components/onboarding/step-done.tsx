'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StepDoneProps {
  onAddMore: () => void;
}

export function StepDone({ onAddMore }: StepDoneProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center gap-6 py-12">
      <div className="w-16 h-16 rounded-2xl bg-[#34d399]/10 flex items-center justify-center">
        <CheckCircle size={32} className="text-[#34d399]" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-[#c8d6e5]">
          Dein Host ist eingerichtet!
        </h2>
        <p className="text-[13px] text-[#4a5a6e]">
          Du kannst jetzt eine Terminal-Session starten oder einen weiteren Host hinzufuegen.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="lg" onClick={() => router.push('/terminal')}>
          Zum Terminal
        </Button>
        <Button variant="outline" size="lg" onClick={onAddMore}>
          Weiteren Host hinzufuegen
        </Button>
      </div>
    </div>
  );
}
