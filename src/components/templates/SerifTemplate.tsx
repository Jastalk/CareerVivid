
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const SerifTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', serif`, color: readableAccent(themeColor) };
  const bodyStyle = { fontFamily: `'${bodyFont}', serif` };
  const headingStyle = { fontFamily: `'${titleFont}', serif` };

  return (
    <div className="p-10 bg-white text-gray-800" style={bodyStyle}>
      <header className="mb-6 text-center">
        <div className="flex justify-center gap-2">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={headingStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-bold" 
                style={headingStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg text-gray-600 mt-1 block" 
            style={headingStyle}
            tagName="p"
            placeholder="Job Title"
        />
      </header>
      
      <div className="text-xs text-center border-t border-b py-2 mb-6 flex justify-center gap-1">
          <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
          <span>|</span>
          <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
          <span>|</span>
          <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
      </div>

      <main>
        <section className="mb-6">
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-center italic leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-2xl font-bold mb-3 border-b pb-1" style={titleStyle}>Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-xl font-semibold block" 
                style={headingStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <div className="flex gap-1 italic">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>,</span>
                    <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <div className="flex gap-1">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="mt-1 leading-relaxed whitespace-pre-wrap text-sm block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-8">
            <div>
                <h2 className="text-2xl font-bold mb-3 border-b pb-1" style={titleStyle}>Education</h2>
                {education.map((edu, index) => (
                    <div key={edu.id} className="mb-3">
                    <InlineEdit 
                        value={edu.degree} 
                        fieldId={`education[${index}].degree`} 
                        onFocus={onFocus} 
                        className="text-xl font-semibold block" 
                        style={headingStyle}
                        tagName="h3"
                        placeholder="Degree"
                    />
                    <InlineEdit 
                        value={edu.school} 
                        fieldId={`education[${index}].school`} 
                        onFocus={onFocus} 
                        className="italic block" 
                        tagName="p"
                        placeholder="School"
                    />
                    <div className="flex gap-1 text-sm text-gray-700">
                        <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                        <span>-</span>
                        <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                    </div>
                    </div>
                ))}
            </div>
             <div>
                <h2 className="text-2xl font-bold mb-3 border-b pb-1" style={titleStyle}>Skills</h2>
                <ul className="list-disc list-inside text-sm">
                    {skills.map((skill, index) => (
                        <li key={skill.id}>
                            <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
      </main>
    </div>
  );
};
