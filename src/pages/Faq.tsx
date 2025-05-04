import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '@/components/ui/button'; // Import Button
import { Link } from 'react-router-dom'; // Import Link for internal routing

const Faq: React.FC = () => {
  const profileUrl = '/profile';
  const supportUrl = '/support';
  const discordInviteUrl = 'https://discord.gg/lolcowuniverse';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-lolcow-black text-gray-300">
        <div className="max-w-5xl mx-auto prose prose-invert lg:prose-xl space-y-8">
          <h1>Frequently Asked Questions</h1>

          <section>
            <h2>How do I access the Lolcowco Discord?</h2>
            <p>To gain access to our exclusive Discord server, you need to meet these requirements:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>Be a Member:</strong> You must have an active "Cash Cow" membership (or higher tier) on at least one of the Lolcowco YouTube channels.
              </li>
              <li>
                <strong>Connect YouTube to Discord:</strong> You need to link your YouTube account (the one with the membership) to your Discord account. Here's how:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li><strong>On Desktop:</strong> Go to Discord User Settings (gear icon bottom-left) &rarr; Connections &rarr; Click the YouTube icon and follow the prompts to log in and authorize.</li>
                  <li><strong>On Mobile:</strong> Tap your profile picture (bottom-right) &rarr; Connections &rarr; Add (top-right) &rarr; Select YouTube and follow the prompts to log in and authorize.</li>
                </ul>
              </li>
              <li>
                <strong>Connect on Our Site:</strong> Log in to your account on the <Link to={profileUrl} className="text-lolcow-blue hover:underline">Profile Page</Link>. Our system needs to see your connected Discord account.
              </li>
            </ol>
            <p className="mt-4"><strong>Note:</strong> If you've just connected your YouTube and Discord accounts, it might take a moment for the changes to sync. You can try clicking the "Refresh Discord Connection" button on your <Link to={profileUrl} className="text-lolcow-blue hover:underline">Profile Page</Link> after a minute or two.</p>
          </section>

          <section>
            <h2>I've done all that. How do I join the Discord server now?</h2>
            <p>Great! Once your accounts are linked and you're logged in here, you can join the server using the invite link below. Our bot will automatically check your membership status via the YouTube connection and grant you the appropriate roles within about 5 minutes of joining.</p>
            <div className="mt-4">
              <Button asChild className="bg-lolcow-blue hover:bg-lolcow-light-blue text-white">
                <a href={discordInviteUrl} target="_blank" rel="noopener noreferrer">
                  Join the Lolcowco Discord
                </a>
              </Button>
            </div>
          </section>

          <section>
            <h2>I just upgraded my membership, when will it show?</h2>
            <p>
              It usually takes around 20 minutes for YouTube membership changes to sync with Discord and for your role to be automatically updated on our server. If it's been longer than that and your role hasn't updated, please try clicking the "Refresh Discord Connection" button on your <Link to={profileUrl} className="text-lolcow-blue hover:underline">Profile Page</Link> first. If that doesn't work, please contact support.
            </p>
          </section>

          <section>
            <h2>Anything else? What if I'm stuck?</h2>
            <p>If you've followed the steps and are still having trouble accessing the Discord or have other questions, please reach out to our support team.</p>
            <div className="mt-4">
              <Button asChild variant="outline" className="border-lolcow-blue text-lolcow-blue hover:bg-lolcow-blue hover:text-white">
                 <Link to={supportUrl}>Get Support</Link>
              </Button>
            </div>
          </section>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Faq; 