import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms: React.FC = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const websiteUrl = 'https://www.lolcow.co';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black text-gray-300">
        <div className="max-w-5xl mx-auto prose prose-invert lg:prose-xl space-y-6">
          <h1>Terms of Usage for Lolcowco</h1>

          <p>Last Updated: {formattedDate}</p>

          <p>Welcome to Lolcowco! These terms and conditions outline the rules and regulations for the use of Lolcowco's Website, located at {websiteUrl}.</p>

          <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use Lolcowco if you do not agree to take all of the terms and conditions stated on this page.</p>

          <h2>Cookies</h2>
          <p>We employ the use of cookies. By accessing Lolcowco, you agreed to use cookies in agreement with the Lolcowco's Privacy Policy.</p>
          <p>Most interactive websites use cookies to let us retrieve the user's details for each visit. Cookies are used by our website to enable the functionality of certain areas to make it easier for people visiting our website. Some of our affiliate/advertising partners may also use cookies.</p>

          <h2>License</h2>
          <p>Unless otherwise stated, Lolcowco and/or its licensors own the intellectual property rights for all material on Lolcowco. All intellectual property rights are reserved. You may access this from Lolcowco for your own personal use subjected to restrictions set in these terms and conditions.</p>
          <p>You must not:</p>
          <ul>
            <li>Republish material from Lolcowco</li>
            <li>Sell, rent or sub-license material from Lolcowco</li>
            <li>Reproduce, duplicate or copy material from Lolcowco</li>
            <li>Redistribute content from Lolcowco</li>
          </ul>
          <p>This Agreement shall begin on the date hereof.</p>

          <h2>User Comments</h2>
          <p>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Lolcowco does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of Lolcowco, its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions.</p>
          <p>To the extent permitted by applicable laws, Lolcowco shall not be liable for the Comments or for any liability, damages or expenses caused and/or suffered as a result of any use of and/or posting of and/or appearance of the Comments on this website.</p>
          <p>Lolcowco reserves the right to monitor all Comments and to remove any Comments which can be considered inappropriate, offensive or causes breach of these Terms and Conditions.</p>
          <p>You warrant and represent that:</p>
          <ul>
            <li>You are entitled to post the Comments on our website and have all necessary licenses and consents to do so;</li>
            <li>The Comments do not invade any intellectual property right, including without limitation copyright, patent or trademark of any third party;</li>
            <li>The Comments do not contain any defamatory, libelous, offensive, indecent or otherwise unlawful material which is an invasion of privacy</li>
            <li>The Comments will not be used to solicit or promote business or custom or present commercial activities or unlawful activity.</li>
          </ul>
          <p>You hereby grant Lolcowco a non-exclusive license to use, reproduce, edit and authorize others to use, reproduce and edit any of your Comments in any and all forms, formats or media.</p>

          <h2>Hyperlinking to our Content</h2>
          <p>The following organizations may link to our Website without prior written approval:</p>
          <ul>
            <li>Government agencies;</li>
            <li>Search engines;</li>
            <li>News organizations;</li>
            <li>Online directory distributors may link to our Website in the same manner as they hyperlink to the Websites of other listed businesses; and</li>
            <li>System wide Accredited Businesses except soliciting non-profit organizations, charity shopping malls, and charity fundraising groups which may not hyperlink to our Web site.</li>
          </ul>
          <p>These organizations may link to our home page, to publications or to other Website information so long as the link: (a) is not in any way deceptive; (b) does not falsely imply sponsorship, endorsement or approval of the linking party and its products and/or services; and (c) fits within the context of the linking party's site.</p>

          <h2>iFrames</h2>
          <p>Without prior approval and written permission, you may not create frames around our Webpages that alter in any way the visual presentation or appearance of our Website.</p>

          <h2>Content Liability</h2>
          <p>We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website. No link(s) should appear on any Website that may be interpreted as libelous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other violation of, any third party rights.</p>

          <h2>Reservation of Rights</h2>
          <p>We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amen these terms and conditions and it's linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.</p>

          <h2>Removal of links from our website</h2>
          <p>If you find any link on our Website that is offensive for any reason, you are free to contact and inform us any moment. We will consider requests to remove links but we are not obligated to or so or to respond to you directly.</p>
          <p>We do not ensure that the information on this website is correct, we do not warrant its completeness or accuracy; nor do we promise to ensure that the website remains available or that the material on the website is kept up to date.</p>

          <h2>Disclaimer</h2>
          <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
          <ul>
            <li>limit or exclude our or your liability for death or personal injury;</li>
            <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
            <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
            <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
          </ul>
          <p>The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.</p>
          <p>As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms; 