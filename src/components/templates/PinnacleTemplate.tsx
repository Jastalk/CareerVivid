
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent, readableBorder } from '../../utils/templateInk';

export const PinnacleTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-white text-gray-800" style={bodyStyle}>
      <header className="p-8 border-b-4" style={{borderColor: readableBorder(themeColor)}}>
        <InlineEdit 
            value={personalDetails.firstName.toUpperCase()} 
            fieldId="personalDetails.firstName" 
            onFocus={onFocus} 
            className="text-5xl font-bold block" 
            style={titleStyle}
            tagName="h1"
            placeholder="FIRST NAME"
        />
        <InlineEdit 
            value={personalDetails.lastName.toUpperCase()} 
            fieldId="personalDetails.lastName" 
            onFocus={onFocus} 
            className="text-5xl font-bold block" 
            style={titleStyle}
            tagName="h1"
            placeholder="LAST NAME"
        />
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-xl text-gray-600 mt-2 block" 
            style={titleStyle}
            tagName="p"
            placeholder="Job Title"
        />
        <div className="text-sm text-gray-600 mt-2 flex gap-1">
            <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
            <span>|</span>
            <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            <span>|</span>
            <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
        </div>
      </header>

      <main className="p-8">
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-2" style={{...titleStyle, color: readableAccent(themeColor)}}>Professional Profile</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Work Experience</h2>
              {employmentHistory.map((job, index) => (
                <div key={job.id} className="mb-4">
                  <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                  />
                  <InlineEdit 
                    value={job.employer} 
                    fieldId={`employmentHistory[${index}].employer`} 
                    onFocus={onFocus} 
                    className="text-md italic block" 
                    tagName="p"
                    placeholder="Employer"
                  />
                  <div className="flex gap-1 text-xs text-gray-600">
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
          <div>
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Skills</h2>
              <ul className="list-disc list-inside text-sm">
                {skills.map((skill, index) => (
                    <li key={skill.id}>
                        <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                    </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Education</h2>
              {education.map((edu, index) => (
                <div key={edu.id}>
                  <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Degree"
                  />
                  <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-md italic block" 
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
          </div>
        </div>
      </main>
    </div>
  );
};
