
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';

export const CompactTemplate: React.FC<TemplateProps> = ({ resume, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;
  
  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-6 text-sm bg-white text-gray-800" style={bodyStyle}>
      <header className="flex justify-between items-center mb-4">
        <div>
          <div className="flex gap-1">
              <InlineEdit 
                value={personalDetails.firstName} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-2xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="First Name"
              />
              <InlineEdit 
                value={personalDetails.lastName} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-2xl font-bold" 
                style={titleStyle}
                tagName="h1"
                placeholder="Last Name"
              />
          </div>
          <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-lg text-gray-700 block" 
            style={titleStyle}
            tagName="h2"
            placeholder="Job Title"
          />
        </div>
        <div className="text-right text-xs text-gray-600 space-y-1">
          <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
          <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
          <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
        </div>
      </header>

      <main>
        <section className="mb-3">
          <h3 className="text-md font-bold border-b border-gray-300 pb-1 mb-1" style={titleStyle}>SUMMARY</h3>
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-xs leading-normal block whitespace-pre-wrap"
            tagName="p"
            placeholder="Summary..."
          />
        </section>
        
        <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
                <section className="mb-3">
                  <h3 className="text-md font-bold border-b border-gray-300 pb-1 mb-1" style={titleStyle}>EXPERIENCE</h3>
                  {employmentHistory.map((job, index) => (
                    <div key={job.id} className="mb-2">
                      <div className="flex justify-between">
                        <InlineEdit 
                            value={job.jobTitle} 
                            fieldId={`employmentHistory[${index}].jobTitle`} 
                            onFocus={onFocus} 
                            className="font-bold block" 
                            style={titleStyle}
                            tagName="h4"
                            placeholder="Job Title"
                        />
                        <div className="flex gap-1 text-xs text-gray-600">
                            <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                            <span>-</span>
                            <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                        </div>
                      </div>
                      <div className="flex gap-1 text-xs italic">
                          <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                          <span>,</span>
                          <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                      </div>
                      <InlineEdit 
                        value={job.description} 
                        fieldId={`employmentHistory[${index}].description`} 
                        onFocus={onFocus} 
                        className="text-xs mt-1 leading-normal whitespace-pre-wrap block"
                        tagName="p"
                        placeholder="Description..."
                      />
                    </div>
                  ))}
                </section>
            </div>
            <div className="col-span-4">
                 <section className="mb-3">
                  <h3 className="text-md font-bold border-b border-gray-300 pb-1 mb-1" style={titleStyle}>SKILLS</h3>
                  <ul className="text-xs list-disc list-inside">
                      {skills.map((skill, index) => (
                        <li key={skill.id}>
                            <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                        </li>
                      ))}
                  </ul>
                </section>
                <section>
                  <h3 className="text-md font-bold border-b border-gray-300 pb-1 mb-1" style={titleStyle}>EDUCATION</h3>
                  {education.map((edu, index) => (
                    <div key={edu.id} className="mb-2">
                      <InlineEdit 
                        value={edu.degree} 
                        fieldId={`education[${index}].degree`} 
                        onFocus={onFocus} 
                        className="font-bold block" 
                        style={titleStyle}
                        tagName="h4"
                        placeholder="Degree"
                      />
                      <InlineEdit 
                        value={edu.school} 
                        fieldId={`education[${index}].school`} 
                        onFocus={onFocus} 
                        className="text-xs italic block" 
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
