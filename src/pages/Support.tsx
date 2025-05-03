
import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SupportTicketForm from "../components/SupportTicketForm";

const Support: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-fredoka text-white mb-8 text-center">
            Support Center
          </h1>
          
          <div className="mb-8 text-center">
            <p className="text-gray-300 max-w-2xl mx-auto">
              Having trouble with your account or have questions about our services? 
              Fill out the form below and our support team will get back to you as soon as possible.
            </p>
          </div>
          
          <SupportTicketForm />

          <div className="mt-12 bg-lolcow-darkgray rounded-lg p-6">
            <h2 className="text-xl font-fredoka text-white mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg text-lolcow-blue font-medium">How do I connect my YouTube account?</h3>
                <p className="text-gray-300 mt-1">
                  You can connect your YouTube account by visiting your profile page and clicking on "Connect YouTube" button.
                </p>
              </div>
              <div>
                <h3 className="text-lg text-lolcow-blue font-medium">Why can't I access the Discord server?</h3>
                <p className="text-gray-300 mt-1">
                  Access to our Discord server requires an active membership. If you have a "Ban World" role or no membership,
                  you won't be able to access the server.
                </p>
              </div>
              <div>
                <h3 className="text-lg text-lolcow-blue font-medium">How long does it take to get a response to my support ticket?</h3>
                <p className="text-gray-300 mt-1">
                  We typically respond to support tickets within 24-48 hours during business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
