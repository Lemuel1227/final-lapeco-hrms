import React, { useRef, useState, useEffect } from 'react';
import logo from '../../../assets/logo.png';
import './Website.css';
import ApplicationForm from './ApplicationForm';
import Chatbot from './Chatbot';
import homeBg from '../../../assets/page4.png';

const Website = () => {
  const homeRef = useRef(null);
  const aboutRef = useRef(null);
  const contactRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (ref, section) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);

      const sections = [
        { ref: homeRef, name: 'home' },
        { ref: aboutRef, name: 'about' },
        { ref: contactRef, name: 'contact' }
      ];

      sections.forEach(({ ref, name }) => {
        const element = ref.current;
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(name);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  return (
    <div className="website-container">
      <header className={`website-header ${visible ? 'visible' : 'hidden'}`}>
        <div className="logo-container">
          <img src={logo} alt="LAPECO Logo" className="logo" />
        </div>
        
        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        
        <nav className={`nav ${mobileMenuOpen ? 'active' : ''}`}>
          <button 
            onClick={() => scrollToSection(homeRef, 'home')} 
            className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
          >
            Home
          </button>
          <button 
            onClick={() => scrollToSection(aboutRef, 'about')} 
            className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
          >
            About us
          </button>
          <button 
            onClick={() => scrollToSection(contactRef, 'contact')} 
            className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
          >
            Contact
          </button>
          <button 
            onClick={() => {
              setShowForm(true);
              setMobileMenuOpen(false);
            }} 
            className="nav-link apply-button"
          >
            Apply now
          </button>
          <button 
            onClick={() => {
              setShowChatbot(!showChatbot);
              setMobileMenuOpen(false);
            }} 
            className={`nav-link ask-peco ${showChatbot ? 'active' : ''}`}
          >
            Ask Peco
          </button>
        </nav>
      </header>

      <section
        ref={homeRef}
        className="hero-section"
      >
        <div className="hero-content">
          <h1 className="hero-subtitle">BE A PART OF</h1>
          <h1 className="hero-subtitle">LAPECO</h1>
          <h2 className="tagline">We make your ideas become possible</h2>
          <button onClick={() => setShowForm(true)} className="hero-button">Apply now</button>
        </div>
      </section>

       <section ref={aboutRef} className="about-section">
        <div className='about-inner'>
          <h2 className="section-title">About us</h2>
          <div className="about-highlight">
            <h3>How can LAPECO be a key to your success?</h3>
          </div>
          <div className="about-content">
            <div className="about-item">
              <div className="about-item-content">
                <p>One of the keys in business is having good communication between clients and owners. At LAPECO, we welcome customers' ideas and provide suggestions to support business growth. LAPECO helps expand your products by managing your packaging process.</p>
              </div>
            </div>
            
            <div className="about-item">
              <div className="about-item-content">
                <p>LAPECO is a packaging company with high standards in manufacturing. We use precise equipment suited to your product and can produce bulk orders quickly to boost your sales. We partner with multinational companies in the food industry and support startups equally.</p>
              </div>
            </div>

            <div className="about-item">
              <div className="about-item-content">
                <p>Outsourcing your product to a reputable packaging company like LAPECO is a smart move. You'll save time and focus on enhancing your product while we handle cost-effective, high-quality packaging with skilled manpower.</p>
              </div>
            </div>

            <div className="about-item">
              <div className="about-item-content">
                <p>Managing your own production team requires covering health insurance and other benefits. LAPECO helps lower production costs while maintaining consistent product quality. We provide user-friendly and cost-efficient packaging equipment.</p>
              </div>
            </div>
            
            <div className="about-item">
              <div className="about-item-content">
                <p>Allpack, our equipment supplier, has been providing machines to multinational companies for nearly a decade. Each machine is crafted with precision and undergoes rigorous quality checks to ensure long-term functionality.</p>
              </div>
            </div>
          </div>

          <div className="what-we-offer">
            <h2>What we offer</h2>
            <ul>
              <li>Toll Packing</li>
              <li>Packaging equipment:
                <ul>
                  <li>Blending machines</li>
                  <li>Filling machines</li>
                  <li>Box forming machines</li>
                  <li>Moulding machines</li>
                  <li>Labelling machines</li>
                </ul>
              </li>
            </ul>
            <p>Allpack also offers custom-built machines with unique specifications based on your business needs.</p>
          </div>
        </div>
      </section>

      <section ref={contactRef} className="contact-section">
        <h2 className="section-title">Contact</h2>
        <div className="contact-grid">
          <div>
            <h3>For Inquiries</h3>
            <p>Email: <a href="mailto:Albert@lapeco.com.co">Albert@lapeco.com.co</a></p>
            <p>Landline: (049) 576 0367</p>
            <p>Phone: 0917 594 8954</p>
            <p>Address: L9 B3 Cabuyao Central Subd. Commercial lot, Pulo, Cabuyao, Laguna</p>
          </div>

          <div>
            <h3>For Careers</h3>
            <p>Email: <a href="mailto:hrd.lapeco@gmail.com">hrd.lapeco@gmail.com</a></p>
            <p>Landline: (049) 304 7118</p>
            <p>Phone: 0917 550 0968</p>
          </div>

          <div className="map-container">
            <iframe
              title="LAPECO Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3850.726282147873!2d121.128149!3d14.242875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bd631647bd55eb%3A0xcba38b8be27a0af2!2sLaguna%20Packaging%20Equipment%20Corp.%20-%20LAPECO!5e0!3m2!1sen!2sph!4v1752981234567!5m2!1sen!2sph" 
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {showForm && <ApplicationForm onClose={() => setShowForm(false)} />}
      {showChatbot && <Chatbot onClose={() => setShowChatbot(false)} />}

      <footer className="footer">
        <p>Copyright © 2020, Laguna Packaging Equipment Corporation</p>
      </footer>
    </div>
  );
};

export default Website;