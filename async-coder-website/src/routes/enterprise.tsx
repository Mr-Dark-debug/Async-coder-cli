import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/page";
import { useState } from "react";
import { Shield, Server, Users, Key, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise — async-coder" },
      {
        name: "description",
        content: "Self-host async-coder for your team. SSO, custom LLM gateways, and private deployments.",
      },
      { property: "og:title", content: "Enterprise — async-coder" },
      { property: "og:url", content: "/enterprise" },
    ],
    links: [{ rel: "canonical", href: "/enterprise" }],
  }),
  component: EnterprisePage,
});

function EnterprisePage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    teamSize: "10-50",
    deployment: "cloud",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a production environment, this would post to a lead-gen endpoint.
    // For this static-exportable client site, we simulate success.
    setSubmitted(true);
  };

  return (
    <Page
      eyebrow="Enterprise"
      title="Secure, self-hosted AI coding."
      description="Deploy async-coder on your own infrastructure. Give your team the power of autonomous agents without sending code to third-party platforms."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12 items-start mt-8">
        {/* Left Column: Selling Points */}
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-2xl font-semibold mb-3">Enterprise-grade agent infrastructure</h2>
            <p className="text-muted-foreground leading-relaxed">
              async-coder is designed from the ground up for zero telemetry. With the Enterprise edition, 
              we extend this design to fit modern organizational security and compliance needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={Shield}
              title="SSO & Role-Based Access"
              description="Integrate with Okta, Azure AD, or any SAML provider to manage developer seats and enforce access control."
            />
            <FeatureCard
              icon={Server}
              title="Private VPC Deployment"
              description="Keep all code inside your network. Deploy async-coder in AWS, GCP, Azure, or on-premise Kubernetes."
            />
            <FeatureCard
              icon={Key}
              title="Custom LLM Gateway"
              description="Configure a central proxy to manage API keys, audit prompt payloads, and enforce data loss prevention (DLP) rules."
            />
            <FeatureCard
              icon={Users}
              title="Team Analytics & Cost Controls"
              description="Track total token usage, per-user cost allocation, and model performance on a centralized admin console."
            />
          </div>

          <div className="rounded-xl border border-lavender/20 bg-lavender/5 p-6">
            <h3 className="font-display font-semibold text-foreground mb-2">Looking for the OSS version?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The standard single-developer CLI is completely free, MIT-licensed, and runs locally. 
              Enterprise features are meant for organizations needing centralized billing, SSO, and compliance audits.
            </p>
          </div>
        </div>

        {/* Right Column: Lead Form */}
        <div className="rounded-xl border border-border/60 bg-panel/40 p-6 md:p-8">
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">Request received</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thank you for your interest. A member of our engineering team will reach out to <strong>{formData.email}</strong> shortly to discuss your requirements.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 text-xs text-lavender hover:underline"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Request enterprise trial</h3>
              
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jane Doe"
                  className="w-full h-10 px-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full h-10 px-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Corp"
                  className="w-full h-10 px-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Team Size
                  </label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground transition-colors"
                  >
                    <option value="1-10">1-10 devs</option>
                    <option value="10-50">10-50 devs</option>
                    <option value="50-200">50-200 devs</option>
                    <option value="200+">200+ devs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Deployment
                  </label>
                  <select
                    value={formData.deployment}
                    onChange={(e) => setFormData({ ...formData, deployment: e.target.value })}
                    className="w-full h-10 px-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground transition-colors"
                  >
                    <option value="cloud">Managed VPC</option>
                    <option value="on-premise">On-Premise</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Use Case & Requirements
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Tell us about your setup..."
                  rows={3}
                  className="w-full p-3 rounded-md bg-elevated border border-border/80 focus:border-lavender focus:ring-1 focus:ring-lavender text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-2 rounded-md bg-lavender text-primary-foreground font-medium text-sm hover:bg-lavender-soft transition-colors glow-lavender"
              >
                Request Enterprise Access
              </button>
            </form>
          )}
        </div>
      </div>
    </Page>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-lavender/10 border border-lavender/25 text-lavender">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-display font-semibold text-foreground text-sm">{title}</h4>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
