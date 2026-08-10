
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const CascadeTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-white text-gray-800" style={bodyStyle}>
      <header className="p-8 bg-gray-100 text-center">
        <div className="flex justify-center gap-2">
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
            className="text-xl block mt-1" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="Job Title"
        />
        <div className="flex justify-center gap-1 text-sm text-gray-600 mt-2">
            <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            <span>|</span>
            <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
        </div>
      </header>

      <main className="p-8">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8">
            <section className="mb-6">
              <h2 className="text-2xl font-semibold mb-3" style={titleStyle}>Summary</h2>
              <InlineEdit 
                value={professionalSummary} 
                fieldId="professionalSummary" 
                onFocus={onFocus} 
                className="text-sm leading-relaxed block whitespace-pre-wrap"
                tagName="p"
                placeholder="Summary..."
              />
            </section>
            <section>
              <h2 className="text-2xl font-semibold mb-3" style={titleStyle}>Experience</h2>
              {employmentHistory.map((job, index) => (
                <div key={job.id} className="mb-4">
                  <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                  />
                  <div className="flex gap-1 text-md italic text-gray-700">
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
                    className="text-sm mt-1 whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                  />
                </div>
              ))}
            </section>
          </div>
          <aside className="col-span-4">
            <section className="bg-gray-100 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-2" style={titleStyle}>Skills</h2>
              <ul className="space-y-1 text-sm">
                {skills.map((skill, index) => (
                    <li key={skill.id}>
                        <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                    </li>
                ))}
              </ul>
            </section>
            <section className="bg-gray-100 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2" style={titleStyle}>Education</h2>
              {education.map((edu, index) => (
                <div key={edu.id} className="text-sm mb-2">
                  <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Degree"
                  />
                  <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="block" 
                    tagName="p"
                    placeholder="School"
                  />
                  <div className="flex gap-1 text-xs text-gray-600">
                      <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                      <span>-</span>
                      <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                  </div>
                </div>
              ))}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};
