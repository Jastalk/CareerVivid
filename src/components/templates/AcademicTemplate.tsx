
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const AcademicTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-8 bg-white text-gray-900 leading-normal" style={bodyStyle}>
      <header className="text-center border-b pb-4 mb-6">
        <div className="flex justify-center gap-2">
            <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-3xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
            />
            <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-3xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg block" 
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="Job Title"
        />
        <div className="text-sm mt-2 flex justify-center gap-1">
          <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
          <span>|</span>
          <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
          <span>|</span>
          <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
        </div>
      </header>

      <main>
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>Summary</h2>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-sm block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>

        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>Education</h2>
          {education.map((edu, index) => (
            <div key={edu.id} className="text-sm mb-2">
              <div className="flex justify-between">
                <div className="flex gap-1">
                    <InlineEdit value={edu.school} fieldId={`education[${index}].school`} onFocus={onFocus} placeholder="School" style={{fontWeight: 'bold', ...titleStyle}} />
                    <span>,</span>
                    <InlineEdit value={edu.city} fieldId={`education[${index}].city`} onFocus={onFocus} placeholder="City" />
                </div>
                <div className="flex gap-1">
                    <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <InlineEdit 
                value={edu.degree} 
                fieldId={`education[${index}].degree`} 
                onFocus={onFocus} 
                className="italic block"
                tagName="p"
                placeholder="Degree"
              />
              <InlineEdit 
                value={edu.description} 
                fieldId={`education[${index}].description`} 
                onFocus={onFocus} 
                className="whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>Research Experience</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="text-sm mb-2">
              <div className="flex justify-between">
                <div className="flex gap-1">
                    <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" style={{fontWeight: 'bold', ...titleStyle}} />
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
                value={job.jobTitle} 
                fieldId={`employmentHistory[${index}].jobTitle`} 
                onFocus={onFocus} 
                className="italic block"
                tagName="p"
                placeholder="Job Title"
              />
              <InlineEdit 
                value={job.description} 
                fieldId={`employmentHistory[${index}].description`} 
                onFocus={onFocus} 
                className="mt-1 whitespace-pre-wrap block"
                tagName="p"
                placeholder="Description..."
              />
            </div>
          ))}
        </section>
        
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>Skills</h2>
          <div className="text-sm">
            {skills.map((skill, index) => (
                <div key={skill.id} className="flex gap-1">
                    <strong className="mr-1">
                        <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />:
                    </strong> 
                    <span>{skill.level}</span>
                </div>
            ))}
          </div>
        </section>

        {/* This is a placeholder for sections common in academic CVs */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>Publications</h2>
          <p className="text-sm italic text-gray-600">[This is a placeholder section. Add publications details in the employment/education description field.]</p>
        </section>
        
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b mb-2 pb-1" style={titleStyle}>References</h2>
          <p className="text-sm italic text-gray-600">Available upon request.</p>
        </section>
      </main>
    </div>
  );
};
