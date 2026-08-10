
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe, GitBranch, Code } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const TechnicalTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-8 bg-white text-gray-800" style={bodyStyle}>
      <style>{`
        .font-mono-special { font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace; }
      `}</style>
      <header className="flex justify-between items-start pb-4 border-b-2 border-gray-800">
        <div>
          <div className="flex gap-2 items-end">
              <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
              />
              <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
              />
          </div>
          <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-xl font-mono-special block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="h2"
            placeholder="Job Title"
          />
        </div>
        <div className="text-right text-xs space-y-1">
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" className="truncate max-w-[150px]" />
              <Mail size={12} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
              <Phone size={12} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
          <div className="flex items-center justify-end">
              <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
              <MapPin size={12} className="ml-2 flex-shrink-0 transform translate-y-px" />
          </div>
          {websites.map((site, index) => (
            <div key={site.id} className="flex items-center justify-end">
              <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
              </a>
              <Globe size={12} className="ml-2 flex-shrink-0 transform translate-y-px" />
            </div>
          ))}
        </div>
      </header>

      <main className="mt-6">
        <section className="mb-6">
          <h3 className="text-lg font-mono-special text-gray-800 mb-2" style={titleStyle}>// SUMMARY</h3>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h3 className="text-lg font-mono-special text-gray-800 mb-2" style={titleStyle}>// SKILLS</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {skills.map((skill, index) => (
              <div key={skill.id} className="flex items-center">
                <Code size={14} className="mr-2" style={{color: readableAccent(themeColor)}}/>
                <InlineEdit 
                    value={skill.name} 
                    fieldId={`skills[${index}].name`} 
                    onFocus={onFocus} 
                    className="text-sm font-medium" 
                    placeholder="Skill"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-lg font-mono-special text-gray-800 mb-2" style={titleStyle}>// EXPERIENCE</h3>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div className="flex gap-1">
                    <InlineEdit 
                        value={job.jobTitle} 
                        fieldId={`employmentHistory[${index}].jobTitle`} 
                        onFocus={onFocus} 
                        className="text-md font-bold" 
                        style={titleStyle}
                        tagName="h4"
                        placeholder="Job Title"
                    />
                    <span>@</span>
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" className="text-md font-bold" style={titleStyle} />
                </div>
                <div className="flex gap-1 text-xs text-gray-600 font-mono-special">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-{'>'}</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <ul className="list-disc list-inside mt-2 pl-4">
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    multiline
                    className="text-sm leading-relaxed whitespace-pre-wrap block"
                    placeholder="Description..."
                />
              </ul>
            </div>
          ))}
        </section>

        <section>
          <h3 className="text-lg font-mono-special text-gray-800 mb-2" style={titleStyle}>// EDUCATION</h3>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-2">
               <div className="flex justify-between items-baseline">
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-md font-bold" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Degree"
                />
                <div className="flex gap-1 text-xs text-gray-600 font-mono-special">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-{'>'}</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-1 text-sm">
                  <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                  <span>,</span>
                  <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} placeholder="City" />
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
