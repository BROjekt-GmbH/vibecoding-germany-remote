import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>pending</Badge>);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('applies pending styles', () => {
    const { container } = render(<Badge variant="pending">pending</Badge>);
    expect(container.firstChild).toHaveClass('bg-[#1a2028]');
  });

  it('applies in_progress styles', () => {
    const { container } = render(<Badge variant="in_progress">in progress</Badge>);
    expect(container.firstChild).toHaveClass('text-[#22d3ee]');
  });

  it('applies completed styles', () => {
    const { container } = render(<Badge variant="completed">done</Badge>);
    expect(container.firstChild).toHaveClass('text-[#34d399]');
  });

  it('applies online styles', () => {
    const { container } = render(<Badge variant="online">online</Badge>);
    expect(container.firstChild).toHaveClass('bg-[#064030]');
  });

  it('applies offline styles', () => {
    const { container } = render(<Badge variant="offline">offline</Badge>);
    expect(container.firstChild).toHaveClass('text-[#4a5a6e]');
  });

  it('accepts custom className', () => {
    const { container } = render(<Badge className="custom-class">test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
