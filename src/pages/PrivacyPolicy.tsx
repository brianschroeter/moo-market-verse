import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PrivacyPolicy: React.FC = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const websiteUrl = 'https://www.lolcow.co';
  const companyName = 'Lolcowco';
  const contactEmail = 'contact@lolcow.co'; // Update placeholder

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black text-gray-300">
        <div className="max-w-5xl mx-auto prose prose-invert lg:prose-xl space-y-6">
          <h1>Privacy Policy for {companyName}</h1>

          <p>Last Updated: {formattedDate}</p>

          <p>Welcome to {companyName} ("us", "we", or "our"). We operate {websiteUrl} (hereinafter referred to as the "Service").</p>

          <p>Our Privacy Policy governs your visit to {websiteUrl}, and explains how we collect, safeguard and disclose information that results from your use of our Service.</p>

          <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy. Unless otherwise defined in this Privacy Policy, the terms used in this Privacy Policy have the same meanings as in our Terms and Conditions.</p>

          <p>Our Terms and Conditions ("Terms") govern all use of our Service and together with the Privacy Policy constitutes your agreement with us ("agreement").</p>

          <h2>Information Collection and Use</h2>
          <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>

          <h3>Types of Data Collected</h3>

          <h4>Personal Data</h4>
          <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
          <ul>
            <li>Email address</li>
            <li>First name and last name</li>
            <li>Phone number</li>
            <li>Address, Country, State, Province, ZIP/Postal code, City</li>
            <li>Cookies and Usage Data</li>
          </ul>

          <h4>Usage Data</h4>
          <p>We may also collect information that your browser sends whenever you visit our Service or when you access the Service by or through any device ("Usage Data").</p>
          <p>This Usage Data may include information such as your computer's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>

          <h4>Tracking Cookies Data</h4>
          <p>We use cookies and similar tracking technologies to track the activity on our Service and we hold certain information.</p>
          <p>Cookies are files with a small amount of data which may include an anonymous unique identifier. Cookies are sent to your browser from a website and stored on your device. Other tracking technologies are also used such as beacons, tags and scripts to collect and track information and to improve and analyze our Service.</p>
          <p>You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.</p>

          <h2>Use of Data</h2>
          <p>{companyName} uses the collected data for various purposes:</p>
          <ul>
            <li>To provide and maintain our Service;</li>
            <li>To notify you about changes to our Service;</li>
            <li>To allow you to participate in interactive features of our Service when you choose to do so;</li>
            <li>To provide customer support;</li>
            <li>To gather analysis or valuable information so that we can improve our Service;</li>
            <li>To monitor the usage of our Service;</li>
            <li>To detect, prevent and address technical issues;</li>
            <li>To fulfill any other purpose for which you provide it;</li>
            <li>To carry out our obligations and enforce our rights arising from any contracts entered into between you and us, including for billing and collection;</li>
            <li>To provide you with notices about your account and/or subscription, including expiration and renewal notices, email-instructions, etc.;</li>
            <li>To provide you with news, special offers and general information about other goods, services and events which we offer that are similar to those that you have already purchased or enquired about unless you have opted not to receive such information;</li>
            <li>In any other way we may describe when you provide the information;</li>
            <li>For any other purpose with your consent.</li>
          </ul>

          <h2>Retention of Data</h2>
          <p>We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your Personal Data to the extent necessary to comply with our legal obligations (for example, if we are required to retain your data to comply with applicable laws), resolve disputes, and enforce our legal agreements and policies.</p>

          <h2>Transfer of Data</h2>
          <p>Your information, including Personal Data, may be transferred to – and maintained on – computers located outside of your state, province, country or other governmental jurisdiction where the data protection laws may differ from those of your jurisdiction.</p>

          <h2>Disclosure of Data</h2>
          <p>We may disclose Personal Data that we collect, or you provide:</p>
          <ul>
            <li>Disclosure for Law Enforcement.</li>
            <li>Business Transaction.</li>
            <li>Other cases. We may disclose your information also:</li>
          </ul>

          <h2>Security of Data</h2>
          <p>The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.</p>

          <h2>Changes to This Privacy Policy</h2>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
          <p>We will let you know via email and/or a prominent notice on our Service, prior to the change becoming effective and update the "effective date" at the top of this Privacy Policy.</p>
          <p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>

          <h2>Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <p>By email: {contactEmail}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy; 