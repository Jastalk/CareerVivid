
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const ClassicTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-10 bg-white text-gray-900" style={bodyStyle}>
      <header className="text-center mb-6">
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
            className="text-lg mt-1 block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="Job Title"
        />
        <div className="text-sm text-gray-600 mt-3 flex justify-center gap-1">
          <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
          <span>|</span>
          <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
          <span>|</span>
          <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
        </div>
      </header>

      <div className="w-full h-px bg-gray-300 my-6"></div>

      <main>
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-2" style={titleStyle}>Summary</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-base leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-3" style={titleStyle}>Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-5">
              <div className="flex justify-between items-center">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                />
                <div className="flex gap-1 text-sm text-gray-600 font-medium">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-1 text-md italic text-gray-700">
                  <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                  <span>,</span>
                  <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-2 leading-relaxed whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-3" style={titleStyle}>Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="mb-4">
              <div className="flex justify-between items-center">
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-lg font-semibold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Degree"
                />
                <div className="flex gap-1 text-sm text-gray-600 font-medium">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-1 text-md italic text-gray-700">
                  <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                  <span>,</span>
                  <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} placeholder="City" />
              </div>
            </div>
          ))}
        </section>
        
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-3" style={titleStyle}>Skills</h2>
          <div className="text-sm leading-relaxed flex flex-wrap gap-2">
            {skills.map((skill, index) => (
                <React.Fragment key={skill.id}>
                    <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                    {index < skills.length - 1 && <span>•</span>}
                </React.Fragment>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
