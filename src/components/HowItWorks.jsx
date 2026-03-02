"use client";

const HowItWorks = () => {
  const steps = [
    {
      number: '1',
      title: 'Connect Wallet',
      description: 'Securely link your Phantom, MetaMask, or WalletConnect'
    },
    {
      number: '2',
      title: 'Verify Eligibility',
      description: 'Automated on-chain check for reward qualification'
    },
    {
      number: '3',
      title: 'Receive Allocation',
      description: 'SOL distributed directly to your connected wallet'
    }
  ];

  return (
    <div className="mt-16">
      <h3 className="text-2xl font-bold text-center mb-8 text-gradient">How It Works</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="neon-glass p-6 text-center">
            <div className="w-12 h-12 bg-solana-gradient rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 animate-neon-pulse">
              {step.number}
            </div>
            <h4 className="font-semibold mb-2">{step.title}</h4>
            <p className="text-sm text-gray-400">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;
