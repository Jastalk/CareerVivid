
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const ElegantTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  // Elegant template often looks best with specific serif fonts, so we use the selected ones.
  const titleStyle = { fontFamily: `'${titleFont}', serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', serif` };

  return (
    <div className="p-10 bg-white text-gray-800" style={bodyStyle}>
      <header className="text-center mb-8">
        <div className="flex justify-center gap-3">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-5xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-5xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle.toUpperCase()} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg tracking-widest block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="JOB TITLE"
        />
      </header>

      <div className="text-center text-sm text-gray-600 mb-8 pb-2 border-b-2 border-t-2 border-gray-300 py-3 flex justify-center items-center gap-2 flex-wrap">
        <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
        <span>&bull;</span>
        <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
        <span>&bull;</span>
        <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
      </div>

      <main>
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-4" style={titleStyle}>Summary</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-center text-lg leading-relaxed italic block whitespace-pre-wrap"
            tagName="p"
            placeholder="Professional Summary..."
          />
        </section>
        
        <div className="w-24 h-px bg-gray-300 mx-auto my-10"></div>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-6" style={titleStyle}>Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="mb-6">
              <InlineEdit 
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="text-xl font-bold block" 
                style={titleStyle}
                tagName="h3"
                placeholder="Job Title"
              />
              <div className="flex justify-between text-sm text-gray-600 italic mb-2">
                <div className="flex gap-1">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                    <span>,</span>
                    <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <div className="flex gap-1">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>&ndash;</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="text-md leading-loose whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>

        <div className="w-24 h-px bg-gray-300 mx-auto my-10"></div>

        <section className="grid grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-center mb-6" style={titleStyle}>Education</h2>
            {education.map((edu, index) => (
              <div key={edu.id} className="mb-4 text-center">
                <InlineEdit 
                    value={edu.school} 
                    fieldId={`education[${index}].school`} 
                    onFocus={onFocus} 
                    className="text-xl font-bold block" 
                    style={titleStyle}
                    tagName="h3"
                    placeholder="School"
                />
                <InlineEdit 
                    value={edu.degree} 
                    fieldId={`education[${index}].degree`} 
                    onFocus={onFocus} 
                    className="text-md italic block" 
                    tagName="p"
                    placeholder="Degree"
                />
                <div className="flex justify-center gap-1 text-sm text-gray-600">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>&ndash;</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-center mb-6" style={titleStyle}>Skills</h2>
            <ul className="text-center columns-2">
              {skills.map((skill, index) => (
                <li key={skill.id} className="mb-1 list-none">
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
