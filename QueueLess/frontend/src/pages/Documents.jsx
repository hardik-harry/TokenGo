import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';

const services = [
  {
    id: 1,
    title: "Learner's Licence",
    color: 'var(--primary-color)',
    bgColor: 'rgba(12, 59, 122, 0.06)',
    borderColor: 'rgba(12, 59, 122, 0.2)',
    documents: [
      "Aadhaar Card / Address Proof",
      "Age Proof",
      "Form 2",
      "Form 1 (Medical Fitness Declaration)",
      "Form 1A (Medical Certificate, if applicable)",
      "Passport-size Photograph, if required",
    ],
  },
  {
    id: 2,
    title: "Driving Licence Renewal",
    color: 'var(--accent-color)',
    bgColor: 'rgba(251, 146, 60, 0.06)',
    borderColor: 'rgba(251, 146, 60, 0.2)',
    documents: [
      "Existing Driving Licence",
      "Form 2",
      "Aadhaar Card / Address Proof",
      "Form 1 (Medical Fitness Declaration, if applicable)",
      "Form 1A (Medical Certificate, if applicable)",
      "Passport-size Photograph, if required",
    ],
  },
  {
    id: 3,
    title: "New Vehicle Registration",
    color: 'var(--success-color)',
    bgColor: 'rgba(22, 163, 74, 0.06)',
    borderColor: 'rgba(22, 163, 74, 0.2)',
    documents: [
      "Form 20 (Registration Application)",
      "Form 21 (Sales Certificate)",
      "Form 22 (Roadworthiness Certificate)",
      "Vehicle Insurance Certificate",
      "Address Proof",
      "Vehicle Purchase Invoice",
      "Temporary Registration Certificate, if applicable",
      "Pollution Under Control Certificate, if applicable",
    ],
  },
];

const Documents = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>

      {/* Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 500, padding: '6px 0' }}
        >
          <ArrowLeft size={22} />
          Back to Home
        </button>
      </div>

      <div className="container animate-fade-in" style={{ flex: 1, padding: '40px 24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(12, 59, 122, 0.1)', marginBottom: '18px' }}>
            <FileText size={36} color="var(--primary-color)" />
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '10px' }}>
            Required Documents
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
            Official document checklist for RTO services
          </p>
        </div>

        {/* Service Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {services.map((svc) => (
            <div
              key={svc.id}
              className="card"
              style={{
                padding: '28px 30px',
                borderLeft: `4px solid ${svc.color}`,
                background: svc.bgColor,
                border: `1px solid ${svc.borderColor}`,
                borderLeftWidth: '4px',
                borderLeftColor: svc.color,
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${svc.borderColor}` }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: svc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={22} color="white" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {svc.title}
                  </h2>
                </div>
              </div>

              {/* Document Checklist */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {svc.documents.map((doc, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.97rem',
                      color: 'var(--text-primary)',
                      lineHeight: '1.5',
                    }}
                  >
                    <CheckCircle size={18} color={svc.color} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Disclaimer Note */}
        <div style={{
          marginTop: '36px',
          padding: '18px 20px',
          background: '#fefce8',
          border: '1px solid #fbbf24',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}>
          <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#92400e', lineHeight: '1.6' }}>
            ⚠ Note: Document requirements may vary depending on your application and RTO. Please verify the latest requirements with the official Parivahan portal.
          </p>
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default Documents;

