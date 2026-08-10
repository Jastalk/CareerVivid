
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const CrispTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };
  
  return (
    <div className="p-8 bg-white text-gray-900" style={bodyStyle}>
      <header className="mb-6 pb-4 border-b-2 border-gray-800">
        <div className="flex gap-2">
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
        <div className="flex justify-between items-center">
            <InlineEdit 
                value={personalDetails.jobTitle} 
                fieldId="personalDetails.jobTitle" 
                onFocus={onFocus} 
                className="text-lg font-semibold block" 
                style={{...titleStyle, color: readableAccent(themeColor)}}
                tagName="h2"
                placeholder="Job Title"
            />
            <div className="flex gap-1 text-sm text-gray-600">
                <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
                <span>/</span>
                <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
            </div>
        </div>
      </header>

      <main>
        <section className="mb-5">
          <h3 className="text-md font-bold uppercase text-gray-600 tracking-wider mb-2" style={titleStyle}>Summary</h3>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm leading-normal block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>
        
        <section className="mb-5">
          <h3 className="text-md font-bold uppercase text-gray-600 tracking-wider mb-2" style={titleStyle}>Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => (
              <span key={skill.id} className="inline-flex items-center bg-gray-200 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full">
                  <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
              </span>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <h3 className="text-md font-bold uppercase text-gray-600 tracking-wider mb-3" style={titleStyle}>Work History</h3>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <div>
                    <InlineEdit 
                        value={job.jobTitle} 
                        fieldId={`employmentHistory[${index}].jobTitle`} 
                        onFocus={onFocus} 
                        className="text-lg font-semibold block" 
                        style={titleStyle}
                        tagName="h4"
                        placeholder="Job Title"
                    />
                    <div className="flex gap-1 text-sm text-gray-700">
                        <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                        <span>,</span>
                        <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                    </div>
                </div>
                <div className="flex gap-1 text-xs font-medium text-gray-600">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-sm mt-1 leading-normal whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <section>
          <h3 className="text-md font-bold uppercase text-gray-600 tracking-wider mb-3" style={titleStyle}>Education</h3>
          {education.map((edu, index) => (
            <div key={edu.id} className="flex justify-between items-baseline">
                <div>
                    <InlineEdit 
                        value={edu.degree} 
                        fieldId={`education[${index}].degree`} 
                        onFocus={onFocus} 
                        className="text-lg font-semibold block" 
                        style={titleStyle}
                        tagName="h4"
                        placeholder="Degree"
                    />
                    <div className="flex gap-1 text-sm text-gray-700">
                        <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" />
                        <span>,</span>
                        <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} placeholder="City" />
                    </div>
                </div>
                <div className="flex gap-1 text-xs font-medium text-gray-600">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};
