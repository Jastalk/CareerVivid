
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import InlineEdit from '../InlineEdit';
import { readableAccent } from '../../utils/templateInk';

export const MinimalistTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;

  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="p-12 bg-white text-gray-700" style={bodyStyle}>
      <header className="text-center mb-10">
        <div className="flex justify-center gap-3">
            <InlineEdit 
                value={personalDetails.firstName.toUpperCase()} 
                fieldId="personalDetails.firstName" 
                onFocus={onFocus} 
                className="text-4xl font-light tracking-widest block"
                style={titleStyle}
                tagName="h1"
                placeholder="FIRST NAME"
            />
            <InlineEdit 
                value={personalDetails.lastName.toUpperCase()} 
                fieldId="personalDetails.lastName" 
                onFocus={onFocus} 
                className="text-4xl font-light tracking-widest block"
                style={titleStyle}
                tagName="h1"
                placeholder="LAST NAME"
            />
        </div>
        <InlineEdit 
            value={personalDetails.jobTitle} 
            fieldId="personalDetails.jobTitle" 
            onFocus={onFocus} 
            className="text-md mt-2 block"
            style={{...titleStyle, color: readableAccent(themeColor)}}
            tagName="p"
            placeholder="Job Title"
        />
      </header>

      <div className="flex justify-center items-center flex-wrap gap-x-2 text-xs text-gray-600 mb-10">
        <InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" />
        <span className="mx-2">|</span>
        <InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" />
        <span className="mx-2">|</span>
        <InlineEdit value={personalDetails.address} fieldId="personalDetails.address" onFocus={onFocus} placeholder="Address" />
        {websites.map((site, index) => (
          <React.Fragment key={site.id}>
            <span className="mx-2">|</span>
            <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900" style={{color: readableAccent(themeColor)}}>
                <InlineEdit value={site.label} fieldId={`websites[${index}].label`} onFocus={onFocus} isLink />
            </a>
          </React.Fragment>
        ))}
      </div>

      <main>
        <section className="mb-8">
          <InlineEdit 
            value={professionalSummary} 
            fieldId="professionalSummary" 
            onFocus={onFocus} 
            className="text-center leading-relaxed block whitespace-pre-wrap"
            tagName="p"
            placeholder="Professional Summary..."
          />
        </section>

        <hr className="my-8" />

        <section className="mb-8">
          <h2 className="text-sm font-semibold tracking-widest text-gray-600 text-center mb-6" style={titleStyle}>EXPERIENCE</h2>
          {employmentHistory.map((job, index) => (
            <div key={job.id} className="grid grid-cols-4 gap-4 mb-5">
              <div className="col-span-1 text-right">
                <InlineEdit 
                    value={job.employer} 
                    fieldId={`employmentHistory[${index}].employer`} 
                    onFocus={onFocus} 
                    className="text-sm font-medium block"
                    style={titleStyle}
                    tagName="p"
                    placeholder="Employer"
                />
                <div className="flex justify-end gap-1 text-xs text-gray-600">
                    <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                    <span>-</span>
                    <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                </div>
              </div>
              <div className="col-span-3">
                <InlineEdit 
                    value={job.jobTitle} 
                    fieldId={`employmentHistory[${index}].jobTitle`} 
                    onFocus={onFocus} 
                    className="text-lg font-medium block"
                    style={titleStyle}
                    tagName="h3"
                    placeholder="Job Title"
                />
                <InlineEdit 
                    value={job.description} 
                    fieldId={`employmentHistory[${index}].description`} 
                    onFocus={onFocus} 
                    className="mt-1 text-sm leading-relaxed whitespace-pre-wrap block"
                    tagName="p"
                    placeholder="Description..."
                  />
              </div>
            </div>
          ))}
        </section>

        <hr className="my-8" />
        
        <section className="grid grid-cols-2 gap-8">
            <div>
                <h2 className="text-sm font-semibold tracking-widest text-gray-600 text-center mb-6" style={titleStyle}>EDUCATION</h2>
                 {education.map((edu, index) => (
                    <div key={edu.id} className="text-center mb-4">
                        <InlineEdit 
                            value={edu.degree} 
                            fieldId={`education[${index}].degree`} 
                            onFocus={onFocus} 
                            className="text-lg font-medium block"
                            style={titleStyle}
                            tagName="h3"
                            placeholder="Degree"
                        />
                        <InlineEdit 
                            value={edu.school} 
                            fieldId={`education[${index}].school`} 
                            onFocus={onFocus} 
                            className="text-sm block"
                            tagName="p"
                            placeholder="School"
                        />
                        <div className="flex justify-center gap-1 text-xs text-gray-600">
                            <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                            <span>-</span>
                            <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                        </div>
                    </div>
                ))}
            </div>
            <div>
                 <h2 className="text-sm font-semibold tracking-widest text-gray-600 text-center mb-6" style={titleStyle}>SKILLS</h2>
                 <div className="flex flex-col gap-2.5 max-w-md mx-auto">
                    {skills.map((skill, index) => (
                        <div key={skill.id} className="flex items-start gap-2 text-sm text-left">
                            <span className="text-gray-600 select-none mt-1 flex-shrink-0">•</span>
                            <InlineEdit 
                                value={skill.name} 
                                fieldId={`skills[${index}].name`} 
                                onFocus={onFocus} 
                                placeholder="Skill"
                                className="block text-left"
                            />
                        </div>
                    ))}
                 </div>
            </div>
        </section>
      </main>
    </div>
  );
};
