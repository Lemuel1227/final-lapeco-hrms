import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom error UI
      return (
        <div className="container-fluid p-0 page-module-container">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Something went wrong
            </h4>
            <p>
              An error occurred while loading this page. Please try refreshing the page or contact support if the problem persists.
            </p>
            <hr />
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-danger btn-sm" 
                onClick={() => window.location.reload()}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh Page
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              >
                <i className="bi bi-arrow-left me-1"></i>
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-3">
                <summary className="text-muted">Error Details (Development Only)</summary>
                <pre className="mt-2 text-danger small">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;