
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const SimpleTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif`, color: readableAccent(themeColor) };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-8 bg-white text-gray-800" style={bodyStyle}>
      <header className="mb-6">
        <div className="flex gap-2">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-3xl font-bold" 
                style={{fontFamily: `'${titleFont}', sans-serif`}}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-3xl font-bold" 
                style={{fontFamily: `'${titleFont}', sans-serif`}}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-md text-gray-600 block" 
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

      <main>
        <section className="mb-6">
          <h2 className="text-xl font-semibold border-b pb-1 mb-2" style={titleStyle}>Summary</h2>
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
          <h2 className="text-xl font-semibold border-b pb-1 mb-2" style={titleStyle}>Work Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-lg font-bold block" 
                style={{fontFamily: `'${titleFont}', sans-serif`}}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <div className="flex gap-1">
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
                className="text-sm mt-1 whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold border-b pb-1 mb-2" style={titleStyle}>Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-3">
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="text-lg font-bold block" 
                style={{fontFamily: `'${titleFont}', sans-serif`}}
                tagName="h3"
                placeholder="Degree"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <div className="flex gap-1">
                    <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                    <span>,</span>
                    <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <div className="flex gap-1">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="text-xl font-semibold border-b pb-1 mb-2" style={titleStyle}>Skills</h2>
          <div className="text-sm flex flex-wrap gap-1">
            {skills.map((skill, index) => (
                <React.Fragment key={skill.id}>
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                    {index < skills.length - 1 && <span>,</span>}
                </React.Fragment>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
