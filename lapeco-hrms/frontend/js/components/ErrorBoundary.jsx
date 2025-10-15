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
        <div className="container-fluid p-4">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card border-danger">
                <div className="card-header bg-danger text-white">
                  <h5 className="mb-0">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Something went wrong
                  </h5>
                </div>
                <div className="card-body">
                  <p className="text-muted mb-3">
                    We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                  </p>
                  
                  <div className="d-flex gap-2 mb-3">
                    <button 
                      className="btn btn-primary"
                      onClick={() => window.location.reload()}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Refresh Page
                    </button>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    >
                      Try Again
                    </button>
                  </div>

                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-3">
                      <summary className="text-danger fw-bold mb-2" style={{ cursor: 'pointer' }}>
                        Error Details (Development Mode)
                      </summary>
                      <div className="bg-light p-3 rounded">
                        <h6 className="text-danger">Error:</h6>
                        <pre className="text-danger small mb-3">{this.state.error.toString()}</pre>
                        
                        <h6 className="text-danger">Component Stack:</h6>
                        <pre className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;