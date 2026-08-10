
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const SpaciousTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-16 bg-white text-gray-800" style={bodyStyle}>
      <header className="mb-12">
        <div className="flex gap-3">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-5xl font-bold mb-2" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-5xl font-bold mb-2" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-2xl text-gray-600 block" 
            style={titleStyle}
            tagName="h2"
            placeholder="Job Title"
        />
      </header>

      <main className="grid grid-cols-3 gap-16">
        <aside className="col-span-1">
          <section className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-600 mb-4" style={titleStyle}>Contact</h3>
            <div className="space-y-2">
              <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" className="block" />
              <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" className="block" />
              <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" className="block" />
              {websites.map((site, index) => (
                  <a key={site.id} href={site.url} className="block hover:underline" style={{color: readableAccent(themeColor)}}>
                      <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                  </a>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-600 mb-4" style={titleStyle}>Skills</h3>
            <ul className="space-y-2">
              {skills.map((skill, index) => (
                  <li key={skill.id}>
                      <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                  </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="col-span-2">
          <section className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-600 mb-4" style={titleStyle}>Profile</h3>
            <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Summary..."
            />
          </section>
          <section className="mb-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-600 mb-4" style={titleStyle}>Experience</h3>
            {employmentHistory.map((job, index) => (
              <div key={job.id} className="mb-6">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-xl font-bold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Job Title"
                />
                <div className="text-md text-gray-600 mb-2 flex gap-1">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>|</span>
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                />
              </div>
            ))}
          </section>
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-600 mb-4" style={titleStyle}>Education</h3>
            {education.map((edu, index) => (
              <div key={edu.id}>
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-xl font-bold block" 
                    style={titleStyle}
                    tagName="h4"
                    placeholder="Degree"
                />
                <div className="text-md text-gray-600 flex gap-1">
                    <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                    <span>|</span>
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
};
