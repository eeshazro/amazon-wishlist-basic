import React from 'react';

export default function AmazonFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="amazon-footer">
      {/* Back to top section */}
      <div className="amazon-footer-back-to-top">
        <button onClick={scrollToTop} className="amazon-footer-back-to-top-btn">
          Back to top
        </button>
      </div>

      {/* Main footer content */}
      <div className="amazon-footer-main">
        <div className="amazon-footer-container">
          <div className="amazon-footer-columns">
            {/* Get to Know Us */}
            <div className="amazon-footer-column">
              <h3>Get to Know Us</h3>
              <ul>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Amazon Newsletter</a></li>
                <li><a href="#">About Amazon</a></li>
                <li><a href="#">Accessibility</a></li>
                <li><a href="#">Sustainability</a></li>
                <li><a href="#">Press Center</a></li>
                <li><a href="#">Investor Relations</a></li>
                <li><a href="#">Amazon Devices</a></li>
                <li><a href="#">Amazon Science</a></li>
              </ul>
            </div>

            {/* Make Money with Us */}
            <div className="amazon-footer-column">
              <h3>Make Money with Us</h3>
              <ul>
                <li><a href="#">Sell on Amazon</a></li>
                <li><a href="#">Sell apps on Amazon</a></li>
                <li><a href="#">Supply to Amazon</a></li>
                <li><a href="#">Protect & Build Your Brand</a></li>
                <li><a href="#">Become an Affiliate</a></li>
                <li><a href="#">Become a Delivery Driver</a></li>
                <li><a href="#">Start a Package Delivery Business</a></li>
                <li><a href="#">Advertise Your Products</a></li>
                <li><a href="#">Self-Publish with Us</a></li>
                <li><a href="#">Become an Amazon Hub Partner</a></li>
                <li><a href="#">› See More Ways to Make Money</a></li>
              </ul>
            </div>

            {/* Amazon Payment Products */}
            <div className="amazon-footer-column">
              <h3>Amazon Payment Products</h3>
              <ul>
                <li><a href="#">Amazon Visa</a></li>
                <li><a href="#">Amazon Store Card</a></li>
                <li><a href="#">Amazon Secured Card</a></li>
                <li><a href="#">Amazon Business Card</a></li>
                <li><a href="#">Shop with Points</a></li>
                <li><a href="#">Credit Card Marketplace</a></li>
                <li><a href="#">Reload Your Balance</a></li>
                <li><a href="#">Gift Cards</a></li>
                <li><a href="#">Amazon Currency Converter</a></li>
              </ul>
            </div>

            {/* Let Us Help You */}
            <div className="amazon-footer-column">
              <h3>Let Us Help You</h3>
              <ul>
                <li><a href="#">Your Account</a></li>
                <li><a href="#">Your Orders</a></li>
                <li><a href="#">Shipping Rates & Policies</a></li>
                <li><a href="#">Amazon Prime</a></li>
                <li><a href="#">Returns & Replacements</a></li>
                <li><a href="#">Manage Your Content and Devices</a></li>
                <li><a href="#">Recalls and Product Safety Alerts</a></li>
                <li><a href="#">Registry & Gift List</a></li>
                <li><a href="#">Help</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section with logo and locale */}
      <div className="amazon-footer-bottom">
        <div className="amazon-footer-container">
          <div className="amazon-footer-bottom-content">
            <div className="amazon-footer-logo">
              <svg viewBox="0 0 448 512" className="amazon-logo-icon">
                <path fill="#ff9900" d="M257.2 162.7c-48.7 1.3-97.4 5.4-145.7 11.9-9.9 1.3-19.8 2.8-29.7 4.3-6.5 1-13.1 2.1-19.6 3.2-10.6 1.8-21.2 3.8-31.8 5.9C13.8 190.2 6.1 192.6 0 195.2c16.6-3.8 33.1-7.1 49.6-10.2 5.5-.9 11.1-1.8 16.6-2.6 10.5-1.6 21-3.1 31.5-4.5 19.8-2.6 39.6-4.8 59.4-6.8 6.5-.6 13-.9 19.5-1.3 3.8-.2 7.6-.3 11.4-.4 42.2-1.6 84.4-1.8 126.6-.1 6.5.3 13 .7 19.5 1.2 19.8 1.5 39.6 3.4 59.4 5.7 10.5 1.2 21 2.6 31.5 4.1 5.5.8 11.1 1.7 16.6 2.6 16.5 3.1 33 6.4 49.6 10.2-6.1-2.6-13.8-5-20.3-6.7-10.6-2.1-21.2-4.1-31.8-5.9-6.5-1.1-13.1-2.2-19.6-3.2-9.9-1.5-19.8-3-29.7-4.3-48.3-6.5-97-10.6-145.7-11.9-42.2-1.6-84.4-1.4-126.6.1z"/>
                <path fill="#ff9900" d="M0 195.2c16.6 3.8 33.1 7.1 49.6 10.2 5.5.9 11.1 1.8 16.6 2.6 10.5 1.6 21 3.1 31.5 4.5 19.8 2.6 39.6 4.8 59.4 6.8 6.5.6 13 .9 19.5 1.3 3.8.2 7.6.3 11.4.4 42.2 1.6 84.4 1.8 126.6.1 6.5-.3 13-.7 19.5-1.2 19.8-1.5 39.6-3.4 59.4-5.7 10.5-1.2 21-2.6 31.5-4.1 5.5-.8 11.1-1.7 16.6-2.6 16.5-3.1 33-6.4 49.6-10.2-6.1 2.6-13.8 5-20.3 6.7-10.6 2.1-21.2 4.1-31.8 5.9-6.5 1.1-13.1 2.2-19.6 3.2-9.9 1.5-19.8 3-29.7 4.3-48.3 6.5-97 10.6-145.7 11.9-42.2 1.6-84.4 1.4-126.6-.1-6.5-.3-13-.7-19.5-1.2-19.8-1.5-39.6-3.4-59.4-5.7-10.5-1.2-21-2.6-31.5-4.1-5.5-.8-11.1-1.7-16.6-2.6-16.5-3.1-33-6.4-49.6-10.2z"/>
              </svg>
            </div>
            <div className="amazon-footer-locale">
              <button className="amazon-footer-locale-btn">
                <span className="amazon-footer-globe">🌐</span>
                English
                <span className="amazon-footer-arrow">▼</span>
              </button>
              <button className="amazon-footer-locale-btn">
                <span className="amazon-footer-flag">🇺🇸</span>
                United States
                <span className="amazon-footer-arrow">▼</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 