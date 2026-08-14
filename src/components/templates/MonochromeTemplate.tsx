
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { safeUrl } from '../../utils/safeUrl';

export const MonochromeTemplate: React.FC<TemplateProps> = ({ resume, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-8 bg-white text-black" style={bodyStyle}>
      <header className="text-center mb-8 pb-4 border-b-4 border-black">
        <div className="flex justify-center gap-3">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-5xl font-extrabold tracking-tighter" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-5xl font-extrabold tracking-tighter" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle.toUpperCase()} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg font-medium tracking-widest text-gray-600 mt-1 block" 
            style={titleStyle}
            tagName="p"
            placeholder="JOB TITLE"
        />
      </header>

      <main className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <section className="mb-6">
            <h2 className="text-xl font-bold tracking-wider mb-3" style={titleStyle}>PROFILE</h2>
            <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Profile Summary..."
            />
          </section>

          <section>
            <h2 className="text-xl font-bold tracking-wider mb-3" style={titleStyle}>EXPERIENCE</h2>
            {employmentHistory.map((job, index) => (
              <div key={job.id} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                  />
                  <div className="flex gap-1 text-xs font-semibold text-gray-600">
                      <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
                <InlineEdit 
                    value={job.employer} 
                    fieldId={`employmentHistory[${index}].employer`} 
                    onFocus={onFocus} 
                    className="text-md font-medium text-gray-700 block" 
                    tagName="p"
                    placeholder="Employer"
                />
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="text-sm mt-1 leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                  />
              </div>
            ))}
          </section>
        </div>

        <aside className="col-span-1 pl-8 border-l-2 border-gray-200">
          <section className="mb-6">
            <h2 className="text-xl font-bold tracking-wider mb-3" style={titleStyle}>CONTACT</h2>
            <div className="text-sm space-y-1">
              <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" className="block" />
              <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" className="block" />
              <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" className="block" />
              {websites.map((site, index) => (
                <a key={site.id} href={safeUrl(site.url)} className="block hover:underline">
                    <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
                </a>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-bold tracking-wider mb-3" style={titleStyle}>SKILLS</h2>
            <ul className="text-sm space-y-1">
              {skills.map((skill, index) => (
                <li key={skill.id}>
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                </li>
              ))}
            </ul>
          </section>
          
          <section>
            <h2 className="text-xl font-bold tracking-wider mb-3" style={titleStyle}>EDUCATION</h2>
            {education.map((edu, index) => (
              <div key={edu.id} className="mb-4">
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-lg font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Degree"
                />
                <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-md font-medium block" 
                    tagName="p"
                    placeholder="School"
                />
                <div className="flex gap-1 text-xs font-semibold text-gray-600">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </section>
        </aside>
      </main>
    </div>
  );
};
