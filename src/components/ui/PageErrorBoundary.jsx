import { Component } from 'react';
import { ErrorState } from './PageState';

export default class PageErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="p-6"><ErrorState description="Reload the page to restore the frontend preview." onRetry={() => window.location.reload()} /></div>
      : this.props.children;
  }
}
