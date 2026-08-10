
import React, { useState, useEffect } from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import IconDisplay from '../IconDisplay';
import { readableAccent } from '../../utils/templateInk';

export const ModernTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onUpdate, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites, sectionTitles, customIcons } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle: React.CSSProperties = {
    fontFamily: `'${bodyFont}', sans-serif`,
    fontSize: 'calc(1rem * var(--body-scale, 1))',
    lineHeight: 'var(--line-height, 1.4)',
  };

  // Section and element spacing using CSS variables
  const sectionStyle: React.CSSProperties = {
    marginBottom: 'var(--section-gap, 1.5rem)',
  };
  const paragraphStyle: React.CSSProperties = {
    marginBottom: 'var(--paragraph-gap, 0.5rem)',
  };

  return (
    <div
      className="text-gray-800 bg-white"
      style={{
        ...bodyStyle,
        padding: 'var(--page-margin, 2.5rem)',
      }}
    >
      <header className="text-left" style={sectionStyle}>
        <div className="flex gap-4 items-end">
          <InlineEdit
            value={personalDetails.firstName}
            fieldId="personalDetails.firstName"
            onFocus={onFocus}
            className="text-5xl font-bold text-gray-900"
            tagName="h1"
            placeholder="First Name"
          />
          <InlineEdit
            value={personalDetails.lastName}
            fieldId="personalDetails.lastName"
            onFocus={onFocus}
            className="text-5xl font-bold text-gray-900"
            tagName="h1"
            placeholder="Last Name"
          />
        </div>
        <div style={{ color: readableAccent(themeColor) }}>
          <InlineEdit
            value={personalDetails.jobTitle}
            fieldId="personalDetails.jobTitle"
            onFocus={onFocus}
            className="text-2xl font-light mt-1 block"
            tagName="h2"
            placeholder="Job Title"
          />
        </div>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm mt-4" style={{ color: readableAccent(themeColor) }}>
          <div className="flex items-center gap-1">
            {personalDetails.email && <IconDisplay iconName={customIcons?.email || 'mail'} size={12} />}
            <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
          </div>
          <div className="flex items-center gap-1">
            {personalDetails.phone && <IconDisplay iconName={customIcons?.phone || 'phone'} size={12} />}
            <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
          </div>
          <div className="flex items-center gap-1">
            {personalDetails.city && <IconDisplay iconName={customIcons?.location || 'map-pin'} size={12} />}
            <InlineEdit value={`${personalDetails.city}${personalDetails.country ? `, ${personalDetails.country}` : ''}`} fieldId="personalDetails.city" onFocus={onFocus} placeholder="City, Country" />
          </div>
          {websites.map((site, index) => (
            <a key={site.id || `website-${index}`} href={site.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 flex items-center gap-1">
              <IconDisplay iconName={site.icon || 'globe'} size={12} />
              <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
              {site.showUrl && <span className="text-gray-600 ml-1">{site.url}</span>}
            </a>
          ))}
        </div>
      </header>

      <hr style={{ marginBottom: 'var(--section-gap, 1.5rem)' }} />

      <main>
        <section style={sectionStyle}>
          <InlineEdit
            value={resume.sectionTitles?.profile || 'Profile'}
            fieldId="sectionTitles.profile"
            onFocus={onFocus}
            className="text-sm font-bold uppercase text-gray-600 tracking-widest block"
            tagName="h3"
            style={{ ...titleStyle, ...paragraphStyle }}
          />
          <InlineEdit
            value={professionalSummary}
            fieldId="professionalSummary"
            onFocus={onFocus}
            multiline
            className="leading-relaxed block"
            placeholder="Professional Summary..."
          />
        </section>

        <section style={sectionStyle}>
          <InlineEdit
            value={resume.sectionTitles?.skills || 'Skills'}
            fieldId="sectionTitles.skills"
            onFocus={onFocus}
            className="text-sm font-bold uppercase text-gray-600 tracking-widest block"
            tagName="h3"
            style={{ ...titleStyle, ...paragraphStyle }}
          />
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span key={skill.id || `skill-${index}`} className="inline-flex items-center bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full">
                <InlineEdit
                  value={skill.name}
                  fieldId={`skills[${index}].name`}
                  onFocus={onFocus}
                />
              </span>
            ))}
          </div>
        </section>

        <section style={sectionStyle}>
          <InlineEdit
            value={resume.sectionTitles?.experience || 'Experience'}
            fieldId="sectionTitles.experience"
            onFocus={onFocus}
            className="text-sm font-bold uppercase text-gray-600 tracking-widest block"
            tagName="h3"
            style={{ ...titleStyle, ...paragraphStyle }}
          />
          {employmentHistory.map((job, index) => (
            <div key={job.id || `job-${index}`} style={{ marginBottom: 'var(--paragraph-gap, 0.5rem)' }}>
              <div className="flex justify-between items-baseline">
                <InlineEdit
                  value={job.jobTitle}
                  fieldId={`employmentHistory[${index}].jobTitle`}
                  onFocus={onFocus}
                  className="text-md font-bold text-gray-800 block"
                  tagName="h4"
                />
                <div className="flex gap-1 text-xs font-medium text-gray-600">
                  <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} />
                  <span>-</span>
                  <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} />
                </div>
              </div>
              <div className="text-sm italic text-gray-600 mb-1 flex gap-1">
                <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} />
                <span>,</span>
                <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} />
              </div>
              <InlineEdit
                value={job.description}
                fieldId={`employmentHistory[${index}].description`}
                onFocus={onFocus}
                multiline
                className="mt-1 leading-relaxed whitespace-pre-wrap block"
              />
            </div>
          ))}
        </section>

        <section>
          <InlineEdit
            value={resume.sectionTitles?.education || 'Education'}
            fieldId="sectionTitles.education"
            onFocus={onFocus}
            className="text-sm font-bold uppercase text-gray-600 tracking-widest block"
            tagName="h3"
            style={{ ...titleStyle, ...paragraphStyle }}
          />
          {education.map((edu, index) => (
            <div key={edu.id || `education-${index}`} style={{ marginBottom: 'var(--paragraph-gap, 0.5rem)' }}>
              <div className="flex justify-between items-baseline">
                <InlineEdit
                  value={edu.degree}
                  fieldId={`education[${index}].degree`}
                  onFocus={onFocus}
                  className="text-md font-bold text-gray-800 block"
                  tagName="h4"
                />
                <div className="flex gap-1 text-xs font-medium text-gray-600">
                  <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} />
                  <span>-</span>
                  <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} />
                </div>
              </div>
              <div className="text-sm italic text-gray-600 flex gap-1">
                <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} />
                <span>,</span>
                <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} />
              </div>
              <InlineEdit
                value={edu.description}
                fieldId={`education[${index}].description`}
                onFocus={onFocus}
                multiline
                className="mt-1 leading-relaxed whitespace-pre-wrap block"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
