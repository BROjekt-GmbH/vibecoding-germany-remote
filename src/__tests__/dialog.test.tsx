import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from '@/components/ui/dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={jest.fn()} title="Test"><p>Content</p></Dialog>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Dialog open={true} onClose={jest.fn()} title="Test Dialog"><p>Dialog content</p></Dialog>);
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test"><p>Content</p></Dialog>);
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn();
    render(<Dialog open={true} onClose={onClose} title="Test"><p>Content</p></Dialog>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has dialog role and aria-labelledby', () => {
    render(<Dialog open={true} onClose={jest.fn()} title="My Dialog"><p>Content</p></Dialog>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });
});
