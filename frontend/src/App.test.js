import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ActivityPass heading', () => {
  render(<App />);
  const heading = screen.getByText(/ActivityPass/i);
  expect(heading).toBeInTheDocument();
});
