import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalTabs, type TerminalTab } from '@/components/terminal/terminal-tabs';

const mockTabs: TerminalTab[] = [
  { id: '1', hostId: 'host-1', hostName: 'Server 1', sessionName: 'main', pane: '0', label: 'main:0', position: 0, isActive: true },
  { id: '2', hostId: 'host-1', hostName: 'Server 1', sessionName: 'dev', pane: '0', label: 'dev:0', position: 1, isActive: false },
];

describe('TerminalTabs', () => {
  it('renders all tabs', () => {
    render(
      <TerminalTabs
        tabs={mockTabs}
        activeTabId="1"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        onAddTab={jest.fn()}
      />
    );
    expect(screen.getByText('Server 1:main')).toBeInTheDocument();
    expect(screen.getByText('Server 1:dev')).toBeInTheDocument();
  });

  it('calls onSelectTab when tab is clicked', () => {
    const onSelectTab = jest.fn();
    render(
      <TerminalTabs
        tabs={mockTabs}
        activeTabId="1"
        onSelectTab={onSelectTab}
        onCloseTab={jest.fn()}
        onAddTab={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText('Server 1:dev'));
    expect(onSelectTab).toHaveBeenCalledWith('2');
  });

  it('calls onAddTab when + button is clicked', () => {
    const onAddTab = jest.fn();
    render(
      <TerminalTabs
        tabs={mockTabs}
        activeTabId="1"
        onSelectTab={jest.fn()}
        onCloseTab={jest.fn()}
        onAddTab={onAddTab}
      />
    );
    fireEvent.click(screen.getByLabelText('Open new terminal'));
    expect(onAddTab).toHaveBeenCalledTimes(1);
  });

  it('calls onCloseTab when close button is clicked', () => {
    const onCloseTab = jest.fn();
    render(
      <TerminalTabs
        tabs={mockTabs}
        activeTabId="1"
        onSelectTab={jest.fn()}
        onCloseTab={onCloseTab}
        onAddTab={jest.fn()}
      />
    );
    fireEvent.click(screen.getByLabelText('Close main:0'));
    expect(onCloseTab).toHaveBeenCalledWith('1');
  });
});
