import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-surface">
          <div className="card p-8 max-w-md text-center">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Algo falló</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
